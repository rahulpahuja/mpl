package com.mplauction.android.ui.match

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mplauction.android.data.ScoreBallInput
import com.mplauction.android.data.model.BallOutcome
import com.mplauction.android.data.model.CoinSide
import com.mplauction.android.data.model.ExtraType
import com.mplauction.android.data.model.InningsState
import com.mplauction.android.data.model.Match
import com.mplauction.android.data.model.MatchTeamSide
import com.mplauction.android.data.model.TossDecision
import com.mplauction.android.data.model.WicketType
import com.mplauction.android.data.repository.DraftMatchRepository
import com.mplauction.android.data.repository.MatchRepository
import com.mplauction.android.ui.draft.DraftPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class WicketInput(
  val type: WicketType,
  val dismissedPlayerId: String,
  val fielderId: String?,
  val fielderName: String?,
  val runs: Long,
)

data class MatchUiState(
  val loading: Boolean = true,
  val match: Match? = null,
  // Keyed by playerId — names/avatars come from the draft this match was
  // started from (same document ID), not duplicated onto the match doc.
  val roster: Map<String, DraftPlayer> = emptyMap(),
  val balls: List<BallOutcome> = emptyList(),
  val myUid: String = "",
  val busy: Boolean = false,
  val error: String? = null,
) {
  val canScore: Boolean
    get() = match != null && myUid in match.scorerIds

  val innings: InningsState?
    get() = match?.let { if (it.currentInnings == 1L) it.innings1 else it.innings2 }

  fun side(teamId: String?): MatchTeamSide? =
    match?.let {
      when (teamId) {
        it.teamA.teamId -> it.teamA
        it.teamB.teamId -> it.teamB
        else -> null
      }
    }

  // 0 for teamA, 1 for teamB — indexes draftTeamColor, same as the draft.
  fun teamIndex(teamId: String?): Int = if (match?.teamA?.teamId == teamId) 0 else 1

  fun player(id: String): DraftPlayer = roster[id] ?: DraftPlayer(id = id, name = "Unknown")

  val battingSide: MatchTeamSide?
    get() = side(innings?.battingTeamId)

  val bowlingSide: MatchTeamSide?
    get() = side(innings?.bowlingTeamId)

  val needsBatsman: Boolean
    get() = innings?.let { it.completedReason == null && (it.strikerId == null || it.nonStrikerId == null) } == true

  val needsBowler: Boolean
    get() = innings?.let { it.completedReason == null && it.currentBowlerId == null } == true

  val eligibleBatsmen: List<DraftPlayer>
    get() {
      val current = innings ?: return emptyList()
      return battingSide?.playingXI.orEmpty().filterNot { it in current.battingStats }.map(::player)
    }

  val eligibleBowlers: List<DraftPlayer>
    get() {
      val current = innings ?: return emptyList()
      return bowlingSide?.playingXI.orEmpty().filterNot { it == current.lastOverBowlerId }.map(::player)
    }

  fun ballsFor(inningsNumber: Long): List<BallOutcome> = balls.filter { it.inningsNumber == inningsNumber }

  fun captainName(side: MatchTeamSide): String = side.captainId?.let { player(it).name } ?: side.label()

  val tossSummary: String?
    get() {
      val toss = match?.toss ?: return null
      val winner = side(toss.wonByTeamId) ?: return null
      return "${captainName(winner)} won the toss and chose to ${if (toss.decision == TossDecision.bat) "BAT" else "BOWL"} first"
    }
}

class MatchViewModel(
  private val matchRepository: MatchRepository,
  draftMatchRepository: DraftMatchRepository,
  private val matchId: String,
  private val myUid: String,
) : ViewModel() {
  private val busyState = MutableStateFlow(false)
  private val errorState = MutableStateFlow<String?>(null)

  private data class Status(val busy: Boolean, val error: String?)

  val uiState: StateFlow<MatchUiState> =
    combine(
      matchRepository.observeMatch(matchId),
      draftMatchRepository.observeMatch(matchId),
      matchRepository.observeBalls(matchId),
      combine(busyState, errorState, ::Status),
    ) { match, draft, balls, status ->
      MatchUiState(
        loading = false,
        match = match,
        roster =
          draft?.players.orEmpty().associate {
            it.playerId to DraftPlayer(id = it.playerId, name = it.name, uid = it.uid, avatarId = it.avatarId, photoURL = it.photoURL, role = it.role)
          },
        balls = balls,
        myUid = myUid,
        busy = status.busy,
        error = status.error,
      )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), MatchUiState(myUid = myUid))

  // Every scorer action shares one in-flight guard: a double-tap on a run
  // button must never record two balls.
  private fun perform(block: suspend () -> Unit) {
    if (busyState.value) return
    busyState.value = true
    errorState.value = null
    viewModelScope.launch {
      try {
        block()
      } catch (e: Exception) {
        errorState.value = e.message ?: "Something went wrong"
      } finally {
        busyState.value = false
      }
    }
  }

  fun flipCoin(callerTeamId: String, call: CoinSide) = perform { matchRepository.flipCoin(matchId, callerTeamId, call) }

  fun toss(wonByTeamId: String, decision: TossDecision) = perform { matchRepository.recordToss(matchId, wonByTeamId, decision) }

  fun pickBatsman(player: DraftPlayer) = perform { matchRepository.pickBatsman(matchId, player.id, player.name) }

  fun pickBowler(player: DraftPlayer) = perform { matchRepository.pickBowler(matchId, player.id, player.name) }

  fun score(runs: Long, extraType: ExtraType?) =
    perform { matchRepository.recordBall(matchId, ScoreBallInput(runs = runs, extraType = extraType, isWicket = false, scoredBy = myUid)) }

  fun wicket(input: WicketInput, extraType: ExtraType?) =
    perform {
      matchRepository.recordBall(
        matchId,
        ScoreBallInput(
          runs = input.runs,
          extraType = extraType,
          isWicket = true,
          wicketType = input.type,
          dismissedPlayerId = input.dismissedPlayerId,
          fielderId = input.fielderId,
          fielderName = input.fielderName,
          scoredBy = myUid,
        ),
      )
    }

  fun undo() = perform { matchRepository.undoLastBall(matchId) }

  fun startSecondInnings() = perform { matchRepository.startSecondInnings(matchId) }

  fun clearError() {
    errorState.value = null
  }
}
