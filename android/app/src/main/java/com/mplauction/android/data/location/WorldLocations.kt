package com.mplauction.android.data.location

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Country/state data source for the sport+location filter (see
// SportLocationFilter.kt), backed by a bundled asset instead of the web
// app's `countrycitystatejson` npm package (JS-only, not usable on Android).
// This trims the web app's ~250-country / ~150k-city dataset down to a
// curated country + state list for cricket-relevant regions; city stays a
// free-text field (see LocationValue.city) that still participates in the
// exact-match filter the same way. A fuller bundled dataset can replace this
// asset later without changing any call site.
@Serializable data class CountryEntry(val code: String, val name: String)

@Serializable
private data class WorldLocationsData(
  val countries: List<CountryEntry>,
  val states: Map<String, List<String>> = emptyMap(),
)

object WorldLocations {
  private val json = Json { ignoreUnknownKeys = true }
  private var cache: WorldLocationsData? = null

  private suspend fun data(context: Context): WorldLocationsData {
    cache?.let { return it }
    return withContext(Dispatchers.IO) {
      val raw = context.assets.open("world_locations.json").bufferedReader().use { it.readText() }
      json.decodeFromString<WorldLocationsData>(raw).also { cache = it }
    }
  }

  suspend fun countries(context: Context): List<CountryEntry> = data(context).countries

  suspend fun statesFor(context: Context, countryCode: String): List<String> =
    data(context).states[countryCode] ?: emptyList()
}
