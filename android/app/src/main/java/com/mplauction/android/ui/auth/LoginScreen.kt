package com.mplauction.android.ui.auth

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SportsCricket
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mplauction.android.appContainer

@Composable
fun LoginScreen(modifier: Modifier = Modifier) {
  val context = LocalContext.current
  val container = context.appContainer()
  val viewModel: LoginViewModel = viewModel { LoginViewModel(container.authRepository) }
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()

  Box(modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()), contentAlignment = Alignment.Center) {
    Column(
      modifier = Modifier.widthIn(max = 360.dp).padding(24.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Icon(
        imageVector = Icons.Filled.SportsCricket,
        contentDescription = null,
        tint = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(bottom = 8.dp),
      )
      Text("Auction Manager", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
      Text(
        "Sign in with Google to continue. Your account lets captains and hosts find you by " +
          "name, phone, or email and add you to a match.",
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      Button(
        onClick = { viewModel.signIn(context) },
        enabled = !uiState.loading,
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
      ) {
        if (uiState.loading) {
          CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp).widthIn(max = 16.dp))
        }
        Text(if (uiState.loading) "Signing in..." else "Continue with Google")
      }
      uiState.error?.let { Text(it, color = Color(0xFFDC2626), style = MaterialTheme.typography.bodySmall) }
    }
  }
}
