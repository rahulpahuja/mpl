package com.mplauction.android.ui.home

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.SportsCricket
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.Team
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.data.repository.BootstrapRepository
import com.mplauction.android.ui.auctions.AuctionsDirectoryScreen
import com.mplauction.android.ui.common.GradientTopBar
import com.mplauction.android.ui.draft.MatchesListScreen
import com.mplauction.android.ui.players.PlayersScreen
import com.mplauction.android.ui.profile.ProfileScreen
import com.mplauction.android.ui.teams.TeamsScreen
import com.mplauction.android.ui.tournaments.TournamentsScreen
import com.mplauction.android.ui.users.UsersScreen
import com.mplauction.android.ui.venues.VenuesScreen

// Only the top 4 destinations sit directly in the bottom nav/rail — Material
// guidance caps a bottom bar at ~5 comfortably, and this app has 7 sections
// once you count both admin surfaces and the sections every role sees. The
// rest live behind "More" (see moreExpanded below) instead of cramming every
// icon onto one bar and losing label legibility.
private enum class HomeSection(
  val label: String,
  val title: String,
  val icon: ImageVector,
  val managerOnly: Boolean = false,
  // Narrower than managerOnly (excludes Captain/manager) — mirrors this
  // route's own ProtectedRoute roles list in App.tsx, which is
  // ['admin', 'auctionManager'] for Users specifically, not the broader set
  // Teams/Players/Venues/Tournaments use.
  val adminOrAuctionManagerOnly: Boolean = false,
  val primary: Boolean = true,
) {
  // Not managerOnly: a viewer/player browses the same public directory,
  // just without the create-auction card (see AuctionsDirectoryScreen), and
  // tapping into a live auction routes them to the read-only viewer feed
  // instead of the bidding room (see AuctionRoomScreen's stake check).
  Auctions("Auctions", "Auctions", Icons.Filled.Gavel),
  Teams("Teams", "Teams", Icons.Filled.Groups, managerOnly = true),
  Matches("Matches", "Matches", Icons.Filled.SportsCricket),
  Profile("Profile", "Profile", Icons.Filled.Person),
  Players("Players", "Players", Icons.Filled.People, managerOnly = true, primary = false),
  Venues("Venues", "Venues", Icons.Filled.Place, managerOnly = true, primary = false),
  Tourneys("Tourneys", "Tournaments", Icons.Filled.EmojiEvents, managerOnly = true, primary = false),
  Users("Users", "Users", Icons.Filled.ManageAccounts, adminOrAuctionManagerOnly = true, primary = false),
}

private fun canManageAuctions(role: UserRole) =
  role == UserRole.admin || role == UserRole.auctionManager || role == UserRole.manager

private fun canManageUsers(role: UserRole) = role == UserRole.admin || role == UserRole.auctionManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
  user: AppUser,
  bootstrapRepository: BootstrapRepository,
  onOpenAuction: (Auction) -> Unit,
  onOpenTeam: (Team) -> Unit,
  onClaimAdmin: () -> Unit,
  onOpenMatch: (String) -> Unit,
  onSignOut: () -> Unit,
  modifier: Modifier = Modifier,
) {
  val adminClaimed by bootstrapRepository.adminClaimed().collectAsStateWithLifecycle(initialValue = true)
  var selected by remember { mutableStateOf(HomeSection.Auctions) }
  var moreExpanded by remember { mutableStateOf(false) }
  val visible =
    HomeSection.entries.filter {
      (!it.managerOnly || canManageAuctions(user.role)) && (!it.adminOrAuctionManagerOnly || canManageUsers(user.role))
    }
  val primarySections = visible.filter { it.primary }
  val overflowSections = visible.filter { !it.primary }

  NavigationSuiteScaffold(
    navigationSuiteItems = {
      primarySections.forEach { section ->
        item(
          selected = section == selected,
          onClick = { selected = section },
          icon = { Icon(section.icon, contentDescription = section.title) },
          label = { Text(section.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
        )
      }
      if (overflowSections.isNotEmpty()) {
        item(
          selected = selected in overflowSections,
          onClick = { moreExpanded = true },
          icon = {
            Icon(Icons.Filled.MoreHoriz, contentDescription = "More")
            DropdownMenu(expanded = moreExpanded, onDismissRequest = { moreExpanded = false }) {
              overflowSections.forEach { section ->
                DropdownMenuItem(
                  text = { Text(section.title) },
                  leadingIcon = { Icon(section.icon, contentDescription = null) },
                  onClick = {
                    selected = section
                    moreExpanded = false
                  },
                )
              }
            }
          },
          label = { Text("More", maxLines = 1, overflow = TextOverflow.Ellipsis) },
        )
      }
    },
    modifier = modifier,
  ) {
    Scaffold(
      topBar = { GradientTopBar(title = selected.title) },
    ) { innerPadding ->
      Column(Modifier.fillMaxSize().padding(innerPadding)) {
        if (!adminClaimed && user.role != UserRole.admin) {
          ClaimAdminBanner(onClaimAdmin)
        }
        // Material "fade through": the outgoing section fades out *before*
        // the incoming one fades in. A plain Crossfade overlaps them at
        // partial alpha, which reads as two screens' text ghosting over each
        // other mid-swap, not as a transition.
        AnimatedContent(
          targetState = selected,
          transitionSpec = { fadeIn(tween(durationMillis = 210, delayMillis = 90)) togetherWith fadeOut(tween(90)) },
          label = "home-section",
        ) { section ->
          Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            when (section) {
              HomeSection.Auctions ->
                AuctionsDirectoryScreen(
                  user = user,
                  canCreate = user.role == UserRole.admin || user.role == UserRole.auctionManager,
                  onOpenAuction = onOpenAuction,
                  modifier = Modifier.fillMaxSize(),
                )
              HomeSection.Teams -> TeamsScreen(currentUser = user, onOpenTeam = onOpenTeam, modifier = Modifier.fillMaxSize())
              HomeSection.Players -> PlayersScreen(modifier = Modifier.fillMaxSize())
              HomeSection.Venues -> VenuesScreen(modifier = Modifier.fillMaxSize())
              HomeSection.Tourneys -> TournamentsScreen(currentUserUid = user.uid, modifier = Modifier.fillMaxSize())
              HomeSection.Matches -> MatchesListScreen(currentUser = user, onOpenMatch = onOpenMatch, modifier = Modifier.fillMaxSize())
              HomeSection.Profile -> ProfileScreen(user, onSignOut, modifier = Modifier.fillMaxSize())
              HomeSection.Users -> UsersScreen(isAdmin = user.role == UserRole.admin, modifier = Modifier.fillMaxSize())
            }
          }
        }
      }
    }
  }
}

@Composable
private fun ClaimAdminBanner(onClaimAdmin: () -> Unit) {
  Row(
    Modifier.fillMaxWidth().padding(12.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
  ) {
    Text("No admin has claimed this app yet.", style = MaterialTheme.typography.bodyMedium)
    Button(onClick = onClaimAdmin) { Text("Claim") }
  }
}

