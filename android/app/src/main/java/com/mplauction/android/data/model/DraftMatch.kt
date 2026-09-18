package com.mplauction.android.data.model

import com.google.firebase.Timestamp

// draftMatches/{matchId} — a host-run "pick two captains, draft the rest"
// pre-match roster session. Distinct from Match (live scoring, gated to
// admin/auctionManager): any signed-in user can host one of these.
data class DraftMatch(
  val matchId: String = "",
  val name: String = "",
  val hostUid: String = "",
  val hostName: String = "",
  val createdAt: Timestamp? = null,
  val status: DraftMatchStatus = DraftMatchStatus.lobby,
  // The full roster: users who joined themselves, plus whoever the host
  // added (from the platform's player directory or typed in manually).
  val players: List<DraftMatchPlayer> = emptyList(),
  // uids of real accounts that joined this match — a subset of players'
  // uids, and the set isJoiningDraftMatch in firestore.rules lets a caller
  // append themselves to.
  val joinedUids: List<String> = emptyList(),
  // 0, 1, or 2 player ids — the two captains once chosen in the lobby.
  val captainIds: List<String> = emptyList(),
  val teams: List<DraftMatchTeam> = emptyList(),
  // Undrafted player ids, in captain-pick order once drafting starts.
  val pool: List<String> = emptyList(),
  val turnIndex: Long = 0,
  val turnSeconds: Long = 15,
  // Mirrors Auction.timerEndsAt: every client computes its own countdown
  // off this shared deadline instead of trusting a locally-ticked value, so
  // a phone that was backgrounded catches up correctly on resume.
  val timerEndsAt: Timestamp? = null,
  val lastPick: DraftMatchPick? = null,
)

enum class DraftMatchStatus { lobby, captainReveal, drafting, complete }

data class DraftMatchPlayer(
  val playerId: String = "",
  val name: String = "",
  // Set only for a real account: someone who joined themselves, or a
  // registered platform player the host added by search. Null for a
  // manually-typed player with no account.
  val uid: String? = null,
  val photoURL: String? = null,
  val avatarId: String? = null,
  val phone: String? = null,
  val email: String? = null,
  val role: PlayingRole? = null,
)

data class DraftMatchTeam(
  val captainId: String = "",
  val name: String = "",
  // Includes captainId as its first entry.
  val playerIds: List<String> = emptyList(),
)

// Every field needs a default, like DraftMatchPlayer/DraftMatchTeam above —
// Firestore's mapper only synthesizes the no-arg constructor it needs for
// reflection when ALL constructor params are defaulted; without it, every
// match that reaches its first pick fails to deserialize entirely (caught
// silently by toObjectOrNull, surfacing as "match not found" everywhere).
data class DraftMatchPick(val playerId: String = "", val teamIndex: Long = 0, val auto: Boolean = false, val at: Long = 0)
