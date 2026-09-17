package com.mplauction.android.data

import com.mplauction.android.data.model.PlayingRole

// Mirrors PLAYING_ROLE_LABELS in lib/playingRoles.ts — used to snapshot a
// registered player's profile role as their auction lot's position.
val PLAYING_ROLE_LABELS =
  mapOf(
    PlayingRole.batsman to "Batsmen",
    PlayingRole.bowler to "Bowler",
    PlayingRole.battingAllRounder to "Batting All Rounder",
    PlayingRole.bowlingAllRounder to "Bowling All Rounder",
    PlayingRole.wicketKeeperBatsman to "Wicket Keeper Batsmen",
  )
