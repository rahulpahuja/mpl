package com.mplauction.android.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.mplauction.android.appContainer
import com.mplauction.android.data.repository.AuthState
import com.mplauction.android.ui.auction.AuctionRoomScreen
import com.mplauction.android.ui.auth.ClaimAdminScreen
import com.mplauction.android.ui.auth.LoginScreen
import com.mplauction.android.ui.auth.SessionViewModel
import com.mplauction.android.ui.common.DetailScaffold
import com.mplauction.android.ui.draft.DraftScreen
import com.mplauction.android.ui.draft.ImportPlayersScreen
import com.mplauction.android.ui.home.HomeScreen
import com.mplauction.android.ui.join.JoinAuctionScreen
import com.mplauction.android.ui.teams.TeamDetailScreen
import com.mplauction.android.ui.viewer.ViewerFeedScreen

// Root navigation: gated on the live auth session (see SessionViewModel) so
// signing in/out elsewhere (or a role change pushed from the web app) moves
// this back stack without the user manually navigating.
@Composable
fun MplNavigation() {
  val container = LocalContext.current.appContainer()
  val sessionViewModel: SessionViewModel = viewModel { SessionViewModel(container.authRepository) }
  val authState by sessionViewModel.authState.collectAsStateWithLifecycle()

  when (val state = authState) {
    AuthState.Loading -> LoadingScreen()
    AuthState.SignedOut -> SignedOutNav()
    is AuthState.SignedIn -> SignedInNav(state)
  }
}

@Composable
private fun LoadingScreen() {
  Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}

// No auth required for Watch/ViewerFeed — mirrors the web app's public
// JoinAuction.tsx / ViewerFeed.tsx routes, reachable without signing in.
@Composable
private fun SignedOutNav() {
  val backStack = rememberNavBackStack(Login)
  NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider =
      entryProvider {
        entry<Login> { LoginScreen(onWatch = { backStack.add(Watch) }, modifier = Modifier.fillMaxSize()) }
        entry<Watch> {
          DetailScaffold(title = "Join an auction", onBack = { backStack.removeLastOrNull() }) { modifier ->
            JoinAuctionScreen(
              onJoin = { auction -> backStack.add(ViewerFeed(auction.auctionId, auction.name)) },
              onJoinById = { id -> backStack.add(ViewerFeed(id, "")) },
              modifier = modifier.fillMaxSize(),
            )
          }
        }
        entry<ViewerFeed> { key ->
          DetailScaffold(title = key.name.ifBlank { "Live auction" }, onBack = { backStack.removeLastOrNull() }) { modifier ->
            ViewerFeedScreen(auctionId = key.auctionId, currentUserUid = null, modifier = modifier.fillMaxSize())
          }
        }
      },
  )
}

@Composable
private fun SignedInNav(state: AuthState.SignedIn) {
  val backStack = rememberNavBackStack(Home)
  val container = LocalContext.current.appContainer()

  // A stale AuctionDetail/ClaimAdmin entry from a previous session (e.g. the
  // user signed out and back in as someone else) shouldn't survive a fresh
  // sign-in.
  LaunchedEffect(state.user.uid) {
    if (backStack.size > 1) {
      backStack.clear()
      backStack.add(Home)
    }
  }

  NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider =
      entryProvider {
        entry<Home> {
          HomeScreen(
            user = state.user,
            bootstrapRepository = container.bootstrapRepository,
            onOpenAuction = { auction -> backStack.add(AuctionDetail(auction.auctionId, auction.name)) },
            onOpenTeam = { team -> backStack.add(TeamDetail(team.teamId, team.teamName)) },
            onClaimAdmin = { backStack.add(ClaimAdmin) },
            onOpenMatch = { matchId -> backStack.add(MatchLobby(matchId)) },
            onSignOut = { container.authRepository.signOut() },
            modifier = Modifier.fillMaxSize(),
          )
        }
        entry<MatchLobby> { key ->
          DraftScreen(
            matchId = key.matchId,
            currentUser = state.user,
            onExit = { backStack.removeLastOrNull() },
            onImportPlayers = { backStack.add(ImportDraftPlayers(key.matchId)) },
            modifier = Modifier.fillMaxSize(),
          )
        }
        entry<ImportDraftPlayers> { key ->
          ImportPlayersScreen(matchId = key.matchId, currentUser = state.user, onDone = { backStack.removeLastOrNull() }, modifier = Modifier.fillMaxSize())
        }
        entry<ClaimAdmin> {
          DetailScaffold(title = "Claim Admin Access", onBack = { backStack.removeLastOrNull() }) { modifier ->
            ClaimAdminScreen(user = state.user, onClaimed = { backStack.removeLastOrNull() }, modifier = modifier.fillMaxSize())
          }
        }
        entry<AuctionDetail> { key ->
          DetailScaffold(title = key.name, onBack = { backStack.removeLastOrNull() }) { modifier ->
            AuctionRoomScreen(auctionId = key.auctionId, currentUserUid = state.user.uid, modifier = modifier.fillMaxSize())
          }
        }
        entry<TeamDetail> { key ->
          DetailScaffold(title = key.teamName, onBack = { backStack.removeLastOrNull() }) { modifier ->
            TeamDetailScreen(teamId = key.teamId, modifier = modifier.fillMaxSize())
          }
        }
        entry<Watch> {
          DetailScaffold(title = "Join an auction", onBack = { backStack.removeLastOrNull() }) { modifier ->
            JoinAuctionScreen(
              onJoin = { auction -> backStack.add(ViewerFeed(auction.auctionId, auction.name)) },
              onJoinById = { id -> backStack.add(ViewerFeed(id, "")) },
              modifier = modifier.fillMaxSize(),
            )
          }
        }
        entry<ViewerFeed> { key ->
          DetailScaffold(title = key.name.ifBlank { "Live auction" }, onBack = { backStack.removeLastOrNull() }) { modifier ->
            ViewerFeedScreen(auctionId = key.auctionId, currentUserUid = state.user.uid, modifier = modifier.fillMaxSize())
          }
        }
      },
  )
}
