package com.mplauction.android.data.repository

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import com.mplauction.android.data.AuctionRules
import com.mplauction.android.data.PLAYING_ROLE_LABELS
import com.mplauction.android.data.location.AuctionLocationFields
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.AuctionTeamStats
import com.mplauction.android.data.model.Player
import com.mplauction.android.data.model.PlayerStatus
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.model.TeamManagerEntry
import com.mplauction.android.data.model.TeamPlayerRecord
import com.mplauction.android.data.remote.Firebase
import com.mplauction.android.data.remote.toObjectOrNull
import java.util.Date
import kotlin.random.Random
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val TAG = "AuctionRepository"
private const val ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"

data class NewPlayer(val name: String, val position: String, val basePrice: Long)

// Port of src/lib/auctions.ts + useAuctionsList.ts: the directory list,
// draft creation, Setup (add team/player, go live), and live bidding
// (setCurrentPlayer/placeBid/markSold/markUnsold). Combo lots (multiple
// players sold as one group) aren't ported — every write here treats each
// player as its own lot, unlike the web app.
class AuctionRepository {
  private val db = Firebase.firestore

  fun observeAuctions(): Flow<List<Auction>> = callbackFlow {
    val registration =
      db.collection("auctions")
        .orderBy("createdAt", Query.Direction.DESCENDING)
        .addSnapshotListener { snap, error ->
          if (error != null) {
            // Mirrors useAuctionsList.ts's error handler — an unhandled
            // listener error here previously left the whole page hung (see
            // the bootstrap-admin bug this app already fixed once on web).
            Log.e(TAG, "auctions listener error", error)
            return@addSnapshotListener
          }
          val auctions = snap?.documents?.mapNotNull { it.toObjectOrNull<Auction>() } ?: emptyList()
          trySend(auctions)
        }
    awaitClose { registration.remove() }
  }

  suspend fun createAuction(
    name: String,
    createdBy: String,
    sport: String?,
    location: AuctionLocationFields,
    bidIncrement: Long = 10,
  ): String {
    val auctionId = generateAuctionId()
    val doc =
      mapOf(
        "auctionId" to auctionId,
        "name" to name,
        "status" to "draft",
        "createdBy" to createdBy,
        "bidIncrement" to bidIncrement,
        "auctionManagerIds" to listOf(createdBy),
        "teamManagerIds" to emptyList<String>(),
        "currentPlayerId" to null,
        "timerDurationSeconds" to 30,
        "timerEndsAt" to null,
        "players" to emptyList<Any>(),
        "teamManagers" to emptyList<Any>(),
        "sport" to (sport ?: "cricket"),
        "locationCountryCode" to location.locationCountryCode,
        "locationCountry" to location.locationCountry,
        "locationState" to location.locationState,
        "locationCity" to location.locationCity,
        "location" to location.location,
        "createdAt" to FieldValue.serverTimestamp(),
        "startTime" to null,
      )
    db.collection("auctions").document(auctionId).set(doc).await()
    return auctionId
  }

  private fun generateAuctionId(): String =
    (1..6).map { ID_ALPHABET[Random.nextInt(ID_ALPHABET.length)] }.joinToString("").uppercase()

  private fun auctionRef(auctionId: String) = db.collection("auctions").document(auctionId)
  private fun teamStatsRef(auctionId: String, teamId: String) =
    auctionRef(auctionId).collection("teams").document(teamId)
  private fun bidsRef(auctionId: String, playerId: String) =
    auctionRef(auctionId).collection("bids").document(playerId)

  fun observeAuction(auctionId: String): Flow<Auction?> = callbackFlow {
    val registration =
      auctionRef(auctionId).addSnapshotListener { snap, error ->
        if (error != null) {
          Log.e(TAG, "auction $auctionId listener error", error)
          return@addSnapshotListener
        }
        trySend(snap?.toObjectOrNull<Auction>())
      }
    awaitClose { registration.remove() }
  }

  suspend fun updateAuctionSettings(
    auctionId: String,
    name: String? = null,
    bidIncrement: Long? = null,
    timerDurationSeconds: Long? = null,
  ) {
    val fields = buildMap {
      name?.let { put("name", it) }
      bidIncrement?.let { put("bidIncrement", it) }
      timerDurationSeconds?.let { put("timerDurationSeconds", it) }
    }
    if (fields.isEmpty()) return
    auctionRef(auctionId).update(fields).await()
  }

  suspend fun addPlayer(auctionId: String, name: String, position: String, basePrice: Long) {
    addPlayers(auctionId, listOf(NewPlayer(name, position, basePrice)))
  }

  // Port of addPlayers in lib/auctions.ts — one transaction appending every
  // row instead of a round trip per player, for the CSV-paste import.
  suspend fun addPlayers(auctionId: String, players: List<NewPlayer>) {
    if (players.isEmpty()) return
    val newPlayers =
      players.map { p ->
        Player(playerId = java.util.UUID.randomUUID().toString(), name = p.name, position = p.position, basePrice = p.basePrice, status = PlayerStatus.open)
      }
    appendPlayers(auctionId, newPlayers)
  }

  // Port of handleAddRegisteredPlayer in AuctionSetup.tsx: unlike a
  // manually-typed or CSV-imported row, playerId is the user's own uid (not
  // a random one) so this lot stays linked to their account — their
  // photo/handedness/batting-bowling type snapshot from their profile, and
  // they can see this auction on their own Home page once assignUserToAuction
  // (called by the ViewModel right after this) runs.
  suspend fun addRegisteredPlayer(auctionId: String, user: AppUser, basePrice: Long) {
    val position = user.playingRole?.let { PLAYING_ROLE_LABELS[it] } ?: ""
    val player =
      Player(
        playerId = user.uid,
        name = user.displayName,
        position = position,
        basePrice = basePrice,
        status = PlayerStatus.open,
        encryptedPhoto = user.encryptedPhoto,
        avatarId = user.avatarId,
        photoURL = user.photoURL,
        battingHandedness = user.battingHandedness,
        bowlingHandedness = user.bowlingHandedness,
        battingType = user.battingType,
        bowlingType = user.bowlingType,
      )
    appendPlayers(auctionId, listOf(player))
  }

  private suspend fun appendPlayers(auctionId: String, newPlayers: List<Player>) {
    db.runTransaction { tx ->
      val auction = tx.get(auctionRef(auctionId)).toObjectOrNull<Auction>() ?: throw IllegalStateException("Auction not found")
      tx.update(auctionRef(auctionId), "players", auction.players + newPlayers)
      null
    }.await()
  }

  suspend fun addTeamToAuction(auctionId: String, team: Team, purse: Long, maxPlayers: Long) {
    val entry =
      TeamManagerEntry(
        teamId = team.teamId,
        managerId = team.managerId,
        name = team.teamName,
        maxPlayers = maxPlayers,
        purse = purse,
        tokensSpent = 0,
        remainingTokens = purse,
        logoId = team.logoId,
        logoImage = team.logoImage,
        jerseyColor = team.jerseyColor,
        managerName = team.managerName,
      )
    db.runTransaction { tx ->
      val auction = tx.get(auctionRef(auctionId)).toObjectOrNull<Auction>() ?: throw IllegalStateException("Auction not found")
      if (auction.teamManagers.any { it.teamId == team.teamId }) {
        throw IllegalStateException("This team is already part of this auction")
      }
      tx.update(
        auctionRef(auctionId),
        mapOf(
          "teamManagers" to auction.teamManagers + entry,
          "teamManagerIds" to auction.teamManagerIds + team.managerId,
        ),
      )
      tx.set(
        teamStatsRef(auctionId, team.teamId),
        AuctionTeamStats(
          teamId = team.teamId,
          teamName = team.teamName,
          managerId = team.managerId,
          logoId = team.logoId,
          logoImage = team.logoImage,
          jerseyColor = team.jerseyColor,
          managerName = team.managerName,
          initialPurse = purse,
          spent = 0,
          balance = purse,
          players = emptyList(),
        ),
      )
      tx.update(db.collection("users").document(team.managerId), "assignedAuctions", FieldValue.arrayUnion(auctionId))
      null
    }.await()
  }

  suspend fun goLive(auctionId: String) {
    auctionRef(auctionId).update(mapOf("status" to "live", "startTime" to FieldValue.serverTimestamp())).await()
  }

  // Anyone still 'open'/'active' when the auction ends counts as unsold —
  // mirrors updateAuctionStatus('completed') in auctions.ts.
  suspend fun completeAuction(auctionId: String) {
    db.runTransaction { tx ->
      val ref = auctionRef(auctionId)
      val auction = tx.get(ref).toObjectOrNull<Auction>() ?: throw IllegalStateException("Auction not found")
      val players =
        auction.players.map {
          if (it.status == PlayerStatus.open || it.status == PlayerStatus.active) {
            it.copy(status = PlayerStatus.unsold, currentBid = 0, currentBidder = null, currentBidderName = null)
          } else it
        }
      tx.update(ref, mapOf("status" to "completed", "players" to players, "currentPlayerId" to null, "timerEndsAt" to null))
      null
    }.await()
  }

  suspend fun setCurrentPlayer(auctionId: String, playerId: String) {
    db.runTransaction { tx ->
      val ref = auctionRef(auctionId)
      val auction = tx.get(ref).toObjectOrNull<Auction>() ?: throw IllegalStateException("Auction not found")
      val players = auction.players.map { if (it.playerId == playerId) it.copy(status = PlayerStatus.active) else it }
      tx.update(ref, mapOf("currentPlayerId" to playerId, "players" to players, "timerEndsAt" to null))
      null
    }.await()
  }

  suspend fun startTimer(auctionId: String, durationSeconds: Long) {
    auctionRef(auctionId)
      .update(
        mapOf(
          "timerDurationSeconds" to durationSeconds,
          "timerEndsAt" to Timestamp(Date(System.currentTimeMillis() + durationSeconds * 1000)),
        ),
      )
      .await()
  }

  suspend fun stopTimer(auctionId: String) {
    auctionRef(auctionId).update("timerEndsAt", null).await()
  }

  suspend fun placeBid(auctionId: String, playerId: String, managerId: String, managerName: String, amount: Long) {
    db.runTransaction { tx ->
      val ref = auctionRef(auctionId)
      val auction = tx.get(ref).toObjectOrNull<Auction>() ?: throw IllegalStateException("Auction not found")
      val player = auction.players.find { it.playerId == playerId } ?: throw IllegalStateException("Player not found")
      val manager =
        auction.teamManagers.find { it.managerId == managerId }
          ?: throw IllegalStateException("Manager is not registered for this auction")
      val soldCount = auction.players.count { it.currentBidder == managerId && it.status == PlayerStatus.sold }
      AuctionRules.assertValidBid(player, manager, amount, auction.bidIncrement, soldCount)

      val players =
        auction.players.map {
          if (it.playerId == playerId) {
            it.copy(currentBid = amount, currentBidder = managerId, currentBidderName = managerName, status = PlayerStatus.active)
          } else it
        }
      tx.update(ref, mapOf("players" to players, "currentPlayerId" to playerId))
      tx.set(
        bidsRef(auctionId, playerId),
        mapOf(
          "playerId" to playerId,
          "bids" to
            FieldValue.arrayUnion(
              mapOf("managerId" to managerId, "managerName" to managerName, "amount" to amount, "timestamp" to System.currentTimeMillis()),
            ),
        ),
        SetOptions.merge(),
      )
      null
    }.await()
  }

  suspend fun markSold(auctionId: String, playerId: String) {
    var soldAmount = 0L
    var teamId: String? = null
    db.runTransaction { tx ->
      val ref = auctionRef(auctionId)
      val auction = tx.get(ref).toObjectOrNull<Auction>() ?: throw IllegalStateException("Auction not found")
      val player = auction.players.find { it.playerId == playerId } ?: throw IllegalStateException("Player not found")
      val buyerId = player.currentBidder ?: throw IllegalStateException("No bids placed on this player")
      soldAmount = player.currentBid
      teamId = auction.teamManagers.find { it.managerId == buyerId }?.teamId

      val players = auction.players.map { if (it.playerId == playerId) it.copy(status = PlayerStatus.sold) else it }
      val teamManagers =
        auction.teamManagers.map {
          if (it.managerId == buyerId) it.copy(tokensSpent = it.tokensSpent + soldAmount, remainingTokens = it.remainingTokens - soldAmount)
          else it
        }
      tx.update(ref, mapOf("players" to players, "teamManagers" to teamManagers, "currentPlayerId" to null, "timerEndsAt" to null))
      tx.set(
        bidsRef(auctionId, playerId),
        mapOf("finalBidder" to buyerId, "finalAmount" to soldAmount, "awardedAt" to FieldValue.serverTimestamp()),
        SetOptions.merge(),
      )
      null
    }.await()

    val soldTeamId = teamId ?: return
    recordTeamPurchase(auctionId, playerId, soldTeamId, soldAmount)
  }

  private suspend fun recordTeamPurchase(auctionId: String, playerId: String, teamId: String, amount: Long) {
    val auction = auctionRef(auctionId).get().await().toObjectOrNull<Auction>() ?: return
    val player = auction.players.find { it.playerId == playerId } ?: return
    val statsRef = teamStatsRef(auctionId, teamId)
    val stats = statsRef.get().await().toObjectOrNull<AuctionTeamStats>() ?: return
    statsRef.update(
      mapOf(
        "spent" to stats.spent + amount,
        "balance" to stats.balance - amount,
        "players" to stats.players + TeamPlayerRecord(playerId = playerId, playerName = player.name, soldAt = amount),
      ),
    ).await()
  }

  suspend fun markUnsold(auctionId: String, playerId: String) {
    db.runTransaction { tx ->
      val ref = auctionRef(auctionId)
      val auction = tx.get(ref).toObjectOrNull<Auction>() ?: throw IllegalStateException("Auction not found")
      val players =
        auction.players.map {
          if (it.playerId == playerId) it.copy(status = PlayerStatus.unsold, currentBid = 0, currentBidder = null, currentBidderName = null)
          else it
        }
      tx.update(ref, mapOf("players" to players, "currentPlayerId" to null, "timerEndsAt" to null))
      null
    }.await()
  }
}
