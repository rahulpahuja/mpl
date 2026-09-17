package com.mplauction.android

import com.mplauction.android.data.repository.AuctionRepository
import com.mplauction.android.data.repository.AuthRepository
import com.mplauction.android.data.repository.BootstrapRepository
import com.mplauction.android.data.repository.TeamRepository
import com.mplauction.android.data.repository.TournamentRepository
import com.mplauction.android.data.repository.UserRepository
import com.mplauction.android.data.repository.VenueRepository

// Manual service locator — deliberately not a DI framework: at this app's
// current size (a handful of repositories, no scoping beyond
// application-lifetime singletons) Hilt would be ceremony without payoff.
// Revisit if/when constructor graphs get deep enough that this stops being
// simpler than the alternative.
class AppContainer {
  val authRepository = AuthRepository()
  val bootstrapRepository = BootstrapRepository()
  val auctionRepository = AuctionRepository()
  val teamRepository = TeamRepository()
  val userRepository = UserRepository()
  val venueRepository = VenueRepository()
  val tournamentRepository = TournamentRepository()
}
