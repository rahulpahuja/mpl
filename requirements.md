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

## Host a match (live team-vs-team scoring)

Everything the app currently does stops at the auction — teams get built,
but nobody actually plays a match with them. This adds a real match: two
teams, a live ball-by-ball counter, and a result at the end.

**Why it's needed:** the auction assembles squads; there's no way to then
schedule and run an actual game, track the score live, or build up any
history of how a team or player has performed on the field (as opposed to
what they sold for).

### Team roster

Player-to-team membership currently only exists per-auction
(`AuctionTeamStats.players` on a specific `Auction` doc) — there's no
standing "who's on Team X" list. A match needs one, so `Team` gains a
persistent `roster: RosterPlayer[]`, managed by Admin/Auction Manager/Team
Manager from a roster editor on the Teams page — same registered-player
search-and-add flow already used for auctions (search by name/email/phone/
userCode among `role: 'player'` users, plus manually-typed names for anyone
unregistered).

### Creating a match

An Admin or Auction Manager creates a match by picking:
- Team A and Team B (from the team registry)
- **Format**: `friendly` (stands alone) or `tournament` (linked to a
  Tournament — see below)
- **Day/Night**: day or night, purely descriptive/display
- **Ball type**: tennis or leather
- **Ground type**: ground, box cricket, or gully — also purely descriptive
- **Overs**: the overs limit for each innings
- Optional venue

Then, before the match goes live, a **setup** step: toss (who won, bat or
bowl), and a **Playing XI** (11 players) picked from each team's roster,
with a captain and a wicketkeeper flagged per side.

### Live scoring — the counter

The core of this feature: a scorer screen that records the match ball by
ball.

- **Runs**: 0–6 entered per ball, credited to whoever's on strike; strike
  rotates automatically on odd runs (1, 3, 5) and at the end of every over.
- **Overs**: after the 6th legal ball, the over ends automatically — the two
  batsmen swap ends and the app requires a **new bowler** to be selected
  before the next ball can be scored (the bowler who just finished can't be
  picked again for the very next over).
- **Wickets**: recording a wicket asks for the dismissal type (bowled,
  caught, lbw, run out, stumped, hit wicket, etc.) and, where relevant, the
  fielder. The app then requires the next batsman to be picked from the
  remaining Playing XI before scoring continues — unless it's the 10th
  wicket, which ends the innings.
- **Extras**:
  - **Wide** — 1 extra run, does not count as a legal ball of the over, no
    dismissal possible off it except a run out.
  - **No ball** — 1 extra run, any runs the batsman scores off it are
    credited normally, does not count as a legal ball, and the *next*
    delivery becomes a **Free Hit** (the batsman can't be given out on it
    except by run out).
  - **Bye / Leg bye** — extra runs, counts as a legal ball, no runs credited
    to the batsman.
- Innings ends on all-out, overs completed, or (in the second innings) the
  target being chased down; the match result and margin are computed
  automatically once both innings are done.
- A live public **scoreboard/viewer** page shows the running score,
  current batsmen and bowler, and the full scorecard (like the existing
  auction Viewer/Results split) — no login required to watch, same as the
  auction feed.

### Celebrations

A 4, a 6, or a wicket triggers a full-screen confetti moment (reusing the
canvas particle-burst approach already built for the auction's "SOLD!"
moment) with a matching synthesized sound effect — distinct colors/text per
event (four/six/wicket).

### Tournaments

A match can either stand alone as a **friendly** or belong to a
**Tournament** — a named group of teams with a real points table (played /
won / lost / tied / points, plus net run rate for tie-breaks), recomputed
automatically as each of its matches completes.

### Player career stats

Every player accumulates career numbers as matches complete, independent of
which team or tournament — visible on their profile:
- **Matches played** — incremented for anyone in a Playing XI, whether or
  not they batted/bowled.
- **Batting** — innings, runs, balls faced, fours, sixes, fifties/hundreds,
  highest score, not-outs.
- **Bowling** — innings, overs, runs conceded, wickets, maidens, best
  figures.
- **Fielding** — catches, run outs effected.
- **Wicket-keeping** — stumpings and catches taken specifically while
  keeping, for whoever was flagged as wicketkeeper for that innings.

These aggregate automatically off each match's final scorecard once it's
marked `completed` — no manual entry.

## Split live-doc state from bulk state (scaling)

Both the auction and match features share the same pattern: one Firestore
doc holds everything, and every viewer's `onSnapshot` listener re-receives
the *whole* doc on every change. `placeBid` rewrites the entire `players[]`
array on `auctions/{id}` per bid (`lib/auctions.ts:450-491`); `recordBall`
rewrites the entire innings state on `matches/{id}` per ball
(`lib/matches.ts:174-238`), on top of its own cheap per-ball write to the
`balls` subcollection. Firestore bills realtime listeners per doc-read per
update, so cost scales as **events × concurrent viewers**, not registered
user count — a single well-watched live match/auction can burn through
Spark's daily 50K-read quota on its own (roughly 40-50 concurrent-viewer
matches/day at current doc sizes), and pushes real egress cost on Blaze.

**Why it's needed:** the app is fine at today's traffic, but "host a
match"/live auction are the whole point of the product — usage is inherently
bursty and fan-out-heavy (everyone opens the live view at once). Without
this, growth in spectators (not just players) directly drives Firestore
cost/quota pressure, and Spark's daily caps fail hard mid-event rather than
degrading gracefully.

**What it should do:**
- Split each `auctions/{id}` and `matches/{id}` doc into a small
  frequently-written "live state" doc (current bid/bidder, current
  over/score/batsmen) and a bulk doc (full roster, full scorecard history).
  Viewers listen to the small doc by default; the bulk doc loads once via
  `getDoc`, not `onSnapshot`.
- Finish migrating off the legacy base64 `encryptedPhoto` field on `Player`
  (still written in `syncPlayerProfileSnapshot`, `lib/auctions.ts:200-227`)
  in favor of `photoSourceFilenId` — inline photo bytes get retransmitted to
  every viewer on every unrelated bid until this is gone.
- Confirm the project is on the Blaze plan before a live event outgrows
  Spark's daily quota — Spark fails hard rather than degrading.
- Not urgent: `recordBall` writes are human-paced, no batching/debouncing
  needed yet; `firestore.indexes.json` is empty and fine as long as no
  filtered/sorted list queries get added.
