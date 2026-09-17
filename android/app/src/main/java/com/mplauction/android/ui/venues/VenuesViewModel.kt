package com.mplauction.android.ui.venues

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.model.Venue
import com.mplauction.android.data.repository.VenueRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class VenuesUiState(
  val venues: List<Venue> = emptyList(),
  val name: String = "",
  val location: String = "",
  val creating: Boolean = false,
  val error: String? = null,
)

// Port of AdminVenues.tsx's create/retire/delete paths (see lib/venues.ts).
// Photo gallery management isn't ported — see VenueRepository's doc comment.
class VenuesViewModel(private val venueRepository: VenueRepository) : ViewModel() {
  private val nameState = MutableStateFlow("")
  private val locationState = MutableStateFlow("")
  private val creatingState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  private data class FormState(val name: String, val location: String, val creating: Boolean, val error: String?)

  private val form =
    combine(nameState, locationState, creatingState, errorState) { name, location, creating, error ->
      FormState(name, location, creating, error)
    }

  val uiState: StateFlow<VenuesUiState> =
    combine(venueRepository.observeVenues(), form) { venues, f ->
      VenuesUiState(venues = venues.sortedBy { it.retired == true }, name = f.name, location = f.location, creating = f.creating, error = f.error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), VenuesUiState())

  fun onNameChanged(v: String) { nameState.value = v }
  fun onLocationChanged(v: String) { locationState.value = v }

  fun createVenue() {
    val name = nameState.value.trim()
    val location = locationState.value.trim()
    if (name.isEmpty() || creatingState.value) return
    creatingState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        venueRepository.createVenue(name, location)
        nameState.value = ""
        locationState.value = ""
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't create the venue"
      } finally {
        creatingState.value = false
      }
    }
  }

  fun setRetired(venueId: String, retired: Boolean) {
    viewModelScope.launch {
      try {
        venueRepository.setRetired(venueId, retired)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't update the venue"
      }
    }
  }

  fun delete(venueId: String) {
    viewModelScope.launch {
      try {
        venueRepository.deleteVenue(venueId)
      } catch (e: Exception) {
        errorState.value = e.message ?: "Couldn't delete the venue"
      }
    }
  }
}
