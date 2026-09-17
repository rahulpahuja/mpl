package com.mplauction.android.ui.auctions

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.DEFAULT_SPORT_ID
import com.mplauction.android.data.location.ANY
import com.mplauction.android.data.location.CountryEntry
import com.mplauction.android.data.location.LocationDetector
import com.mplauction.android.data.location.SPORT_LOCATION_ANY
import com.mplauction.android.data.location.SportLocationValue
import com.mplauction.android.data.location.WorldLocations
import com.mplauction.android.data.location.auctionMatchesLocation
import com.mplauction.android.data.location.toAuctionLocation
import com.mplauction.android.data.location.withCity
import com.mplauction.android.data.location.withCountry
import com.mplauction.android.data.location.withDetected
import com.mplauction.android.data.location.withSport
import com.mplauction.android.data.location.withState
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.repository.AuctionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AuctionsDirectoryUiState(
  val loading: Boolean = true,
  val auctions: List<Auction> = emptyList(),
  val filtered: List<Auction> = emptyList(),
  val hiddenCount: Int = 0,
  val filter: SportLocationValue = SPORT_LOCATION_ANY,
  val countries: List<CountryEntry> = emptyList(),
  val states: List<String> = emptyList(),
  val newAuctionName: String = "",
  val creating: Boolean = false,
  val detectingLocation: Boolean = false,
  val error: String? = null,
)

// Port of AdminAuctions.tsx's list/filter/create behavior (useAuctionsList +
// the sport/location filtering + KPI derivation).
class AuctionsDirectoryViewModel(
  private val auctionRepository: AuctionRepository,
  private val currentUserUid: String,
) : ViewModel() {
  private val filterState = MutableStateFlow(SPORT_LOCATION_ANY)
  private val nameState = MutableStateFlow("")
  private val creatingState = MutableStateFlow(false)
  private val detectingState = MutableStateFlow(false)
  private val countriesState = MutableStateFlow<List<CountryEntry>>(emptyList())
  private val statesState = MutableStateFlow<List<String>>(emptyList())
  private val errorState = MutableStateFlow<String?>(null)

  // Filter-adjacent state (the picked value, the loaded country list, the
  // states available for the picked country, and the in-flight "detecting"
  // flag) is combined into one group first, since kotlinx.coroutines'
  // `combine` only has typed overloads up to 5 flows — grouping keeps the
  // outer combine below at 4 sources instead of needing the untyped
  // vararg/Array overload.
  private data class FilterUi(
    val filter: SportLocationValue,
    val countries: List<CountryEntry>,
    val states: List<String>,
    val detecting: Boolean,
  )

  private val filterUi =
    combine(filterState, countriesState, statesState, detectingState) { filter, countries, states, detecting ->
      FilterUi(filter, countries, states, detecting)
    }

  private data class FormUi(val name: String, val creating: Boolean, val error: String?)

  private val formUi = combine(nameState, creatingState, errorState) { name, creating, error -> FormUi(name, creating, error) }

  val uiState: StateFlow<AuctionsDirectoryUiState> =
    combine(
      auctionRepository.observeAuctions(),
      filterUi,
      formUi,
    ) { auctions, filterUiState, formUiState ->
      val filter = filterUiState.filter
      val bySport = auctions.filter { a ->
        filter.sport == ANY || (a.sport ?: DEFAULT_SPORT_ID) == filter.sport
      }
      val bySportLocation = bySport.filter { auctionMatchesLocation(it, filter.toLocation()) }
      AuctionsDirectoryUiState(
        loading = false,
        auctions = auctions,
        filtered = bySportLocation,
        hiddenCount = auctions.size - bySportLocation.size,
        filter = filter,
        countries = filterUiState.countries,
        states = filterUiState.states,
        newAuctionName = formUiState.name,
        creating = formUiState.creating,
        detectingLocation = filterUiState.detecting,
        error = formUiState.error,
      )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AuctionsDirectoryUiState())

  fun loadCountries(context: Context) {
    if (countriesState.value.isNotEmpty()) return
    viewModelScope.launch { countriesState.value = WorldLocations.countries(context) }
  }

  fun onCountrySelected(context: Context, code: String, name: String) {
    filterState.value = filterState.value.withCountry(code, name)
    viewModelScope.launch {
      statesState.value = if (code == ANY) emptyList() else WorldLocations.statesFor(context, code)
    }
  }

  fun onStateSelected(state: String) {
    filterState.value = filterState.value.withState(state)
  }

  fun onCitySelected(city: String) {
    filterState.value = filterState.value.withCity(city)
  }

  fun onSportSelected(sport: String) {
    filterState.value = filterState.value.withSport(sport)
  }

  fun clearFilter() {
    filterState.value = SPORT_LOCATION_ANY
    statesState.value = emptyList()
  }

  fun detectLocation(context: Context) {
    detectingState.value = true
    viewModelScope.launch {
      try {
        val detected = LocationDetector.detect(context)
        if (detected != null) {
          filterState.value = filterState.value.withDetected(detected)
          statesState.value = WorldLocations.statesFor(context, detected.countryCode)
        }
      } catch (e: SecurityException) {
        // No location permission granted — same as the web app silently
        // no-op'ing when geolocation permission isn't already granted (see
        // useDetectedLocation.ts); the caller is expected to request the
        // permission before calling this.
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't detect your location"
      } finally {
        detectingState.value = false
      }
    }
  }

  fun onNameChanged(name: String) {
    nameState.value = name
  }

  fun createAuction(onCreated: (String) -> Unit) {
    val name = nameState.value.trim()
    if (name.isEmpty() || creatingState.value) return
    creatingState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        val filter = filterState.value
        val auctionId =
          auctionRepository.createAuction(
            name = name,
            createdBy = currentUserUid,
            sport = filter.sport.takeIf { it != ANY },
            location = filter.toAuctionLocation(),
          )
        nameState.value = ""
        onCreated(auctionId)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't create the auction"
      } finally {
        creatingState.value = false
      }
    }
  }
}
