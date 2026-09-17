package com.mplauction.android.data

// Mirrors src/lib/sports.ts — single source of truth for the sports the
// platform lists. Only Cricket is wired up; the rest render "Coming soon"
// until they have their own flow, matching the web app.
data class Sport(val id: String, val name: String, val icon: String, val wired: Boolean = false)

val SPORTS =
  listOf(
    Sport("cricket", "Cricket", "🏏", wired = true),
    Sport("football", "Football", "⚽"),
    Sport("rugby", "Rugby", "🏉"),
    Sport("hockey", "Hockey", "🏑"),
    Sport("tennis", "Tennis", "🎾"),
    Sport("basketball", "Basketball", "🏀"),
    Sport("badminton", "Badminton", "🏸"),
    Sport("volleyball", "Volleyball", "🏐"),
    Sport("baseball", "Baseball", "⚾"),
    Sport("kabaddi", "Kabaddi", "🤼"),
    Sport("golf", "Golf", "⛳"),
    Sport("tableTennis", "Table Tennis", "🏓"),
    Sport("bikeRacing", "Bike Racing", "🏍️"),
    Sport("carRacing", "Car Racing", "🏎️"),
    Sport("f1Racing", "F1 Racing", "🏁"),
  )

const val DEFAULT_SPORT_ID = "cricket"

fun sportName(id: String?): String = SPORTS.find { it.id == id }?.name ?: "Cricket"
