package com.mplauction.android.ui.draft

import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.DraftMatchStatus
import com.mplauction.android.data.model.PlayingRole

const val MIN_DRAFT_PLAYERS = 4

data class DraftPlayer(
  val id: String,
  val name: String,
  // Set only for a real account (joined themselves, or a registered
  // platform player the host added by search) — null for someone the host
  // typed in with no account.
  val uid: String? = null,
  val avatarId: String? = null,
  val photoURL: String? = null,
  val phone: String? = null,
  val email: String? = null,
  val role: PlayingRole? = null,
)

// team.players always has the captain as its first element.
data class DraftTeam(val captain: DraftPlayer, val name: String, val players: List<DraftPlayer>)

data class DraftPickEvent(val player: DraftPlayer, val teamIndex: Int, val auto: Boolean, val token: Long)

data class DraftUiState(
  val loading: Boolean = true,
  val found: Boolean = true,
  val matchId: String = "",
  val matchName: String = "",
  val hostUid: String = "",
  val hostName: String = "",
  val myUid: String = "",
  val phase: DraftMatchStatus = DraftMatchStatus.lobby,
  val roster: List<DraftPlayer> = emptyList(),
  val joinedUids: Set<String> = emptySet(),
  val captainIds: List<String> = emptyList(),
  val teams: List<DraftTeam> = emptyList(),
  val pool: List<DraftPlayer> = emptyList(),
  val turnIndex: Int = 0,
  // Raw synced deadline — screens derive a ticking countdown from this
  // (and this device's clock) rather than the ViewModel pushing a tick.
  val timerEndsAtMillis: Long? = null,
  val turnSeconds: Int = 15,
  val lastPick: DraftPickEvent? = null,
  val joining: Boolean = false,
  // Lobby "Import players" search, same shape as AuctionSetupUiState's.
  val registeredSearch: String = "",
  val registeredCandidates: List<AppUser> = emptyList(),
  val addingRegisteredIds: Set<String> = emptySet(),
  // Lobby "Add a new player" form — no account required.
  val manualName: String = "",
  val manualPhone: String = "",
  val manualEmail: String = "",
  val addingManual: Boolean = false,
  val error: String? = null,
) {
  val isHost: Boolean
    get() = myUid.isNotEmpty() && myUid == hostUid

  val hasJoined: Boolean
    get() = myUid in joinedUids

  val captains: List<DraftPlayer>
    get() = captainIds.mapNotNull { id -> roster.find { it.id == id } }

  val canStartDraft: Boolean
    get() = captainIds.size == 2 && roster.size >= MIN_DRAFT_PLAYERS

  val draftedCount: Int
    get() = teams.sumOf { it.players.size - 1 }

  val currentTeam: DraftTeam?
    get() = teams.getOrNull(turnIndex)

  // The host can always pick (standing in for a captain not actively on
  // their phone); the captain whose turn it is can pick for themselves.
  val canIPick: Boolean
    get() = isHost || currentTeam?.captain?.uid == myUid
}
