package com.mplauction.android.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bumptech.glide.integration.compose.ExperimentalGlideComposeApi
import com.bumptech.glide.integration.compose.GlideImage
import com.bumptech.glide.integration.compose.placeholder
import com.mplauction.android.data.defaultAvatar

// A person/team/venue photo, or a themed icon tile when there's nothing to
// load — every list row in the app (players, teams, venues) needs one of
// these, so it's a single Glide entry point rather than each screen wiring
// its own GlideImage + fallback branching.
@OptIn(ExperimentalGlideComposeApi::class)
@Composable
private fun NetworkAvatar(
  url: String,
  contentDescription: String?,
  modifier: Modifier,
  size: Dp,
  shape: Shape,
) {
  GlideImage(
    model = url,
    contentDescription = contentDescription,
    modifier = modifier.size(size).clip(shape),
    loading = placeholder { Box(Modifier.background(MaterialTheme.colorScheme.surfaceVariant)) },
  )
}

@Composable
private fun PresetAvatar(emoji: String, background: androidx.compose.ui.graphics.Color, modifier: Modifier, size: Dp, shape: Shape) {
  Box(modifier.size(size).clip(shape).background(background), contentAlignment = Alignment.Center) {
    Text(emoji, fontSize = (size.value * 0.45).sp)
  }
}

@Composable
private fun IconFallback(icon: ImageVector, contentDescription: String?, modifier: Modifier, size: Dp, shape: Shape) {
  Box(
    modifier.size(size).clip(shape).background(MaterialTheme.colorScheme.secondaryContainer),
    contentAlignment = Alignment.Center,
  ) {
    Icon(icon, contentDescription = contentDescription, tint = MaterialTheme.colorScheme.onSecondaryContainer)
  }
}

// Precedence mirrors Avatar.tsx: an explicit avatarId preset wins over a
// stale photoURL (e.g. a Google sign-in photo someone replaced with an emoji).
@Composable
fun PlayerAvatar(photoURL: String?, avatarId: String? = null, name: String? = null, modifier: Modifier = Modifier, size: Dp = 48.dp) {
  val preset = defaultAvatar(avatarId)
  when {
    preset != null -> PresetAvatar(preset.emoji, preset.background, modifier, size, CircleShape)
    !photoURL.isNullOrBlank() -> NetworkAvatar(photoURL, name, modifier, size, CircleShape)
    else -> IconFallback(Icons.Filled.Person, name, modifier, size, CircleShape)
  }
}

// Precedence mirrors TeamAvatar.tsx: an uploaded logoImage wins over the
// logoId preset.
@Composable
fun TeamAvatar(logoImage: String?, logoId: String? = null, name: String? = null, modifier: Modifier = Modifier, size: Dp = 48.dp) {
  val shape = RoundedCornerShape(12.dp)
  val preset = defaultAvatar(logoId)
  when {
    !logoImage.isNullOrBlank() -> NetworkAvatar(logoImage, name, modifier, size, shape)
    preset != null -> PresetAvatar(preset.emoji, preset.background, modifier, size, shape)
    else -> IconFallback(Icons.Filled.Groups, name, modifier, size, shape)
  }
}

@Composable
fun VenueAvatar(image: String?, name: String?, modifier: Modifier = Modifier, size: Dp = 48.dp) {
  val shape = RoundedCornerShape(12.dp)
  if (!image.isNullOrBlank()) NetworkAvatar(image, name, modifier, size, shape) else IconFallback(Icons.Filled.Place, name, modifier, size, shape)
}
