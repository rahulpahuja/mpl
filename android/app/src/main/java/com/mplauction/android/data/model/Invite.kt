package com.mplauction.android.data.model

// invites/{normalizedEmail} — mirrors lib/invites.ts. A pending role
// assignment for someone who hasn't signed in yet; applied automatically the
// first time they sign in with that Google account.
data class Invite(
  val email: String = "",
  val role: UserRole = UserRole.viewer,
)
