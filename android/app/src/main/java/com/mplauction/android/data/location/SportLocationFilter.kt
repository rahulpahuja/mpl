package com.mplauction.android.data.location

import com.mplauction.android.data.model.Auction

// Port of src/lib/sportLocationFilter.ts. ANY at a level means "don't filter
// on it" — same sentinel string the web app uses, so it round-trips through
// Firestore's `location*` fields unchanged if ever compared directly.
const val ANY = "ANY"

data class LocationValue(
  val countryCode: String = ANY,
  val country: String = ANY,
  val state: String = ANY,
  val city: String = ANY,
)

val LOCATION_ANY = LocationValue()

data class SportLocationValue(
  val sport: String = ANY,
  val countryCode: String = ANY,
  val country: String = ANY,
  val state: String = ANY,
  val city: String = ANY,
) {
  fun toLocation() = LocationValue(countryCode, country, state, city)
}

val SPORT_LOCATION_ANY = SportLocationValue()

// Cascade transitions — changing a level clears every narrower one.
fun SportLocationValue.withCountry(code: String, name: String): SportLocationValue =
  copy(countryCode = code, country = if (code == ANY) ANY else name, state = ANY, city = ANY)

fun SportLocationValue.withState(state: String): SportLocationValue = copy(state = state, city = ANY)

fun SportLocationValue.withCity(city: String): SportLocationValue = copy(city = city)

fun SportLocationValue.withSport(sport: String): SportLocationValue = copy(sport = sport)

fun SportLocationValue.withDetected(detected: DetectedLocation): SportLocationValue =
  copy(
    countryCode = detected.countryCode,
    country = detected.country,
    state = detected.state,
    city = detected.city,
  )

// How a location selection is persisted on an Auction doc.
data class AuctionLocationFields(
  val locationCountryCode: String?,
  val locationCountry: String?,
  val locationState: String?,
  val locationCity: String?,
  val location: String?,
)

fun SportLocationValue.toAuctionLocation(): AuctionLocationFields {
  val country = country.takeIf { it != ANY }
  val state = state.takeIf { it != ANY }
  val city = city.takeIf { it != ANY }
  val parts = listOfNotNull(city, state, country)
  return AuctionLocationFields(
    locationCountryCode = countryCode.takeIf { it != ANY },
    locationCountry = country,
    locationState = state,
    locationCity = city,
    location = parts.takeIf { it.isNotEmpty() }?.joinToString(", "),
  )
}

// "City, State, Country" for the levels that are set, or a fallback.
fun LocationValue.summarize(empty: String = "Anywhere"): String {
  val parts = listOfNotNull(city, state, country).filter { it != ANY }
  return parts.takeIf { it.isNotEmpty() }?.joinToString(", ") ?: empty
}

// True when an auction's stored location satisfies the filter — exact
// equality on each level that isn't ANY.
fun auctionMatchesLocation(auction: Auction, filter: LocationValue): Boolean {
  if (filter.country != ANY && auction.locationCountry != filter.country) return false
  if (filter.state != ANY && auction.locationState != filter.state) return false
  if (filter.city != ANY && auction.locationCity != filter.city) return false
  return true
}
