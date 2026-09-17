package com.mplauction.android.ui.users

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer
import com.mplauction.android.data.model.AppUser
import com.mplauction.android.data.model.Auction
import com.mplauction.android.data.model.UserRole
import com.mplauction.android.ui.common.PlayerAvatar

// Most-privileged to least — the order each role section is displayed in,
// mirroring ROLE_SECTIONS in AdminUsers.tsx.
private val ROLE_SECTIONS =
  listOf(UserRole.admin to "Admin", UserRole.auctionManager to "Auction Manager", UserRole.manager to "Captain", UserRole.player to "Player", UserRole.viewer to "Viewer")

@Composable
fun UsersScreen(isAdmin: Boolean, modifier: Modifier = Modifier) {
  val container = LocalContext.current.appContainer()
  val viewModel: UsersViewModel =
    viewModel(key = "users") { UsersViewModel(container.userRepository, container.inviteRepository, container.auctionRepository) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val auctionNameById = remember(uiState.auctions) { uiState.auctions.associate { it.auctionId to it.name } }

  LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = modifier) {
    if (isAdmin) {
      item { InviteCard(uiState, viewModel) }
      if (uiState.invites.isNotEmpty()) {
        item { Text("Pending invites", style = MaterialTheme.typography.titleSmall) }
        items(uiState.invites, key = { "invite-${it.email}" }) { invite ->
          Card(modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
              Text("${invite.email} — pending as ${invite.role.name}", style = MaterialTheme.typography.bodySmall)
              TextButton(onClick = { viewModel.cancelInvite(invite.email) }) { Text("Cancel") }
            }
          }
        }
      }
    }
    item {
      OutlinedTextField(
        value = uiState.search,
        onValueChange = viewModel::onSearchChanged,
        label = { Text("Search by name, email, or phone") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
    }
    ROLE_SECTIONS.forEach { (role, label) ->
      val roleUsers = uiState.filteredUsers.filter { it.role == role }
      if (roleUsers.isNotEmpty()) {
        item { Text("$label (${roleUsers.size})", style = MaterialTheme.typography.titleSmall) }
        items(roleUsers, key = { it.uid }) { user ->
          UserRow(user, isAdmin, uiState.auctions, auctionNameById, viewModel)
        }
      }
    }
    if (uiState.filteredUsers.isEmpty()) {
      item { Text("No users match \"${uiState.search}\".", style = MaterialTheme.typography.bodyMedium) }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InviteCard(uiState: UsersUiState, viewModel: UsersViewModel) {
  var roleMenuExpanded by remember { mutableStateOf(false) }
  Card {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text("Add a user", style = MaterialTheme.typography.titleSmall)
      Text(
        "Add someone by their Gmail address before they've ever signed in — the role you pick " +
          "is applied automatically the moment they sign in with that Google account.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      OutlinedTextField(
        value = uiState.inviteEmail,
        onValueChange = viewModel::onInviteEmailChanged,
        label = { Text("name@gmail.com") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
      )
      Column {
        AssistChip(onClick = { roleMenuExpanded = true }, label = { Text(ROLE_SECTIONS.first { it.first == uiState.inviteRole }.second) })
        DropdownMenu(expanded = roleMenuExpanded, onDismissRequest = { roleMenuExpanded = false }) {
          ROLE_SECTIONS.forEach { (role, label) ->
            DropdownMenuItem(text = { Text(label) }, onClick = { viewModel.onInviteRoleChanged(role); roleMenuExpanded = false })
          }
        }
      }
      Button(onClick = viewModel::sendInvite, enabled = !uiState.inviting && uiState.inviteEmail.isNotBlank()) {
        Text(if (uiState.inviting) "Adding..." else "Add user")
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UserRow(
  user: AppUser,
  isAdmin: Boolean,
  auctions: List<Auction>,
  auctionNameById: Map<String, String>,
  viewModel: UsersViewModel,
) {
  var roleMenuExpanded by remember { mutableStateOf(false) }
  var auctionMenuExpanded by remember { mutableStateOf(false) }

  Card(modifier = Modifier.fillMaxWidth()) {
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        PlayerAvatar(user.photoURL, user.avatarId, user.displayName)
        Column {
          Text(user.displayName, style = MaterialTheme.typography.bodyLarge)
          Text(user.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
          if (user.phone.isNotBlank()) {
            Text(user.phone, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
          }
        }
      }
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (isAdmin) {
          Column {
            AssistChip(onClick = { roleMenuExpanded = true }, label = { Text(ROLE_SECTIONS.first { it.first == user.role }.second) })
            DropdownMenu(expanded = roleMenuExpanded, onDismissRequest = { roleMenuExpanded = false }) {
              ROLE_SECTIONS.forEach { (role, label) ->
                DropdownMenuItem(text = { Text(label) }, onClick = { viewModel.updateRole(user, role); roleMenuExpanded = false })
              }
            }
          }
        }
        Column {
          AssistChip(onClick = { auctionMenuExpanded = true }, label = { Text("Assign to auction") })
          DropdownMenu(expanded = auctionMenuExpanded, onDismissRequest = { auctionMenuExpanded = false }) {
            auctions.forEach { auction ->
              DropdownMenuItem(
                text = { Text(auction.name) },
                onClick = { viewModel.assignToAuction(user, auction.auctionId); auctionMenuExpanded = false },
              )
            }
          }
        }
      }
      if (user.assignedAuctions.isNotEmpty()) {
        Text(
          user.assignedAuctions.joinToString(", ") { auctionNameById[it] ?: it },
          style = MaterialTheme.typography.labelSmall,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }
  }
}
