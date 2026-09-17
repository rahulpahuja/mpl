package com.mplauction.android.data.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Geocoder
import android.location.LocationManager
import android.os.Build
import android.os.CancellationSignal
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.suspendCancellableCoroutine

data class DetectedLocation(val countryCode: String, val country: String, val state: String, val city: String)

// Port of useDetectedLocation.ts's resolveDetectedLocation: reverse-geocodes
// the device's last known coarse location, then resolves each level as far
// as it matches the bundled country/state dataset (see WorldLocations) —
// unknown state/city falls back to ANY, unknown country to null, same as the
// web app's Nominatim-based version.
object LocationDetector {
  @SuppressLint("MissingPermission")
  suspend fun detect(context: Context): DetectedLocation? {
    val location = currentLocation(context) ?: return null
    val address = reverseGeocode(context, location.latitude, location.longitude) ?: return null

    val countryIso = address.countryCode?.uppercase()
    val countries = WorldLocations.countries(context)
    val country = countries.find { it.code == countryIso } ?: return null

    val states = WorldLocations.statesFor(context, country.code)
    val state = states.find { it.equals(address.adminArea, ignoreCase = true) } ?: ANY
    val city = address.locality ?: address.subAdminArea ?: ANY

    return DetectedLocation(countryCode = country.code, country = country.name, state = state, city = city)
  }

  @SuppressLint("MissingPermission")
  private suspend fun currentLocation(context: Context): android.location.Location? {
    val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val provider =
      listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER)
        .firstOrNull { locationManager.isProviderEnabled(it) } ?: return null

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return suspendCancellableCoroutine { cont ->
        val cancellationSignal = CancellationSignal()
        cont.invokeOnCancellation { cancellationSignal.cancel() }
        locationManager.getCurrentLocation(
          provider,
          cancellationSignal,
          context.mainExecutor,
        ) { cont.resume(it) }
      }
    }
    @Suppress("DEPRECATION") return locationManager.getLastKnownLocation(provider)
  }

  private suspend fun reverseGeocode(context: Context, lat: Double, lon: Double): android.location.Address? {
    val geocoder = Geocoder(context)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return suspendCoroutine { cont ->
        geocoder.getFromLocation(lat, lon, 1) { cont.resume(it.firstOrNull()) }
      }
    }
    @Suppress("DEPRECATION") return geocoder.getFromLocation(lat, lon, 1)?.firstOrNull()
  }
}
