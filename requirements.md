# Requirements

Notes on features that haven't been built yet.

## Re-auction a player

Once a player is marked `sold` or `unsold`, there's currently no way to put
them back up for bidding — `removePlayer` (lib/auctions.ts) explicitly only
allows removing a player whose status is still `open`, and the auction UI has
no path back to `open` for anyone past that point.

**Why it's needed:** mistakes happen during a live auction — a player gets
marked sold to the wrong team, at the wrong price, or a bid is disputed after
the fact. Right now the only fix is manual Firestore surgery; there should be
an in-app way for an Auction Manager to reopen a player.

**What it should do:**
- Let an Auction Manager reset a `sold` or `unsold` player back to `open`
  status from the Results page (or the live panel), so it re-enters the
  "Next up" queue.
- If the player was `sold`, reverse the effect on the winning team: remove
  the player from their squad and refund the purse/tokens spent, mirroring
  the deduction logic in `markSold`.
- Clear the player's `currentBid`, `currentBidder`, and `currentBidderName`
  so it starts clean, same as a freshly-added player.
- Should be restricted to Auction Manager/Admin, same as the rest of the
  live-auction controls, and probably only allowed while the auction is
  still `live` (not `completed`) to avoid reopening a finished auction's
  results after the fact — worth confirming before building.
