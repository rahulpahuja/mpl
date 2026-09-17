package com.mplauction.android.data

import androidx.compose.ui.graphics.Color

data class DefaultAvatar(val id: String, val emoji: String, val background: Color)

// Mirrors src/lib/avatars.ts's DEFAULT_AVATARS exactly (same ids, since
// they're what's actually stored on AppUser.avatarId/Team.logoId) — the
// preset a user or team picks instead of uploading a photo.
val DEFAULT_AVATARS =
  listOf(
    DefaultAvatar("bat", "🏏", Color(0xFFFED7AA)),
    DefaultAvatar("trophy", "🏆", Color(0xFFFEF08A)),
    DefaultAvatar("fire", "🔥", Color(0xFFFECACA)),
    DefaultAvatar("star", "⭐", Color(0xFFFDE68A)),
    DefaultAvatar("lion", "🦁", Color(0xFFFEF9C3)),
    DefaultAvatar("tiger", "🐯", Color(0xFFFFEDD5)),
    DefaultAvatar("eagle", "🦅", Color(0xFFBFDBFE)),
    DefaultAvatar("lightning", "⚡", Color(0xFFE9D5FF)),
    DefaultAvatar("target", "🎯", Color(0xFFBBF7D0)),
    DefaultAvatar("wave", "🌊", Color(0xFFA5F3FC)),
  )

fun defaultAvatar(id: String?): DefaultAvatar? = id?.let { i -> DEFAULT_AVATARS.find { it.id == i } }
