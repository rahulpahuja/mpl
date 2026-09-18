package com.mplauction.android.data.remote

import kotlin.random.Random

private const val ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"

// A short, easy-to-read-aloud-and-type document ID — used anywhere a human
// needs to share a code (an auction ID, a draft match ID) rather than paste
// a full Firestore auto-ID.
fun generateShortId(length: Int = 6): String =
  (1..length).map { ID_ALPHABET[Random.nextInt(ID_ALPHABET.length)] }.joinToString("").uppercase()
