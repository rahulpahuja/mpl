import type { UserRole } from '../types'

// The single source of truth for "how to use this app" documentation.
// Kept as plain data (no JSX) so it can be unit-tested on its own and so any
// page/component that needs to render or link to a section only depends on
// this shape, never on how a given page chooses to lay it out.
export type HelpSectionId = UserRole | 'overview'

export interface HelpBlock {
  heading: string
  steps: string[]
}

export interface HelpSection {
  id: HelpSectionId
  label: string
  summary: string
  body: HelpBlock[]
}

export const helpSections: HelpSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    summary: 'What this app is and how accounts and roles work.',
    body: [
      {
        heading: 'What this app does',
        steps: [
          'Runs a live player auction: an Auction Manager puts players up one at a time, Team Managers bid tokens from a fixed purse, and everyone else can watch live.',
          'Five roles: Admin (sets up auctions and users), Auction Manager (runs the live auction), Team Manager (bids), Player (can be auctioned), and Viewer (watches, no account needed).',
          'All bids, purses, and the current player update in real time for everyone looking at the same auction.',
        ],
      },
      {
        heading: 'Getting an account',
        steps: [
          'Sign in with Google from the Sign in screen to get an account. New sign-ins have no special access until an Admin assigns them.',
          'Only an Admin can promote someone to Team Manager, Auction Manager, or Admin, from the Admin Dashboard.',
          'Viewers don’t sign in at all — use "Join an auction as a viewer" and enter the Auction ID you were given.',
        ],
      },
      {
        heading: 'Your profile',
        steps: [
          'Click "Profile" in the header to add a phone number, WhatsApp number, and location so organizers can reach you.',
          'You’ll be prompted to fill this in the first time you sign in — you can skip it and fill it in later from the Profile link.',
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    summary: 'Claim admin access, create auctions, and manage users.',
    body: [
      {
        heading: 'Becoming the first Admin',
        steps: [
          'New sign-ins have no special access by default. Nobody starts as Admin.',
          'The first signed-in user can visit /bootstrap-admin (or use the banner on the Home page) to claim Admin access — this only works once, before any admin exists.',
          'After that, only an existing Admin can promote other users, from the Admin Dashboard.',
        ],
      },
      {
        heading: 'Admin Dashboard',
        steps: [
          'Create a new auction by typing a name and clicking "Create auction" — this generates a shareable Auction ID.',
          'Use the Setup / Manage / Results / View links next to an auction to configure it, run it live, see outcomes, or watch it as a spectator.',
          'In the Users table, change anyone’s role, and assign Team Managers or Auction Managers to a specific auction.',
          'Delete an auction from the Auctions table once it’s no longer needed — this is permanent and also removes it from every assigned manager’s list.',
        ],
      },
    ],
  },
  {
    id: 'auctionManager',
    label: 'Auction Manager',
    summary: 'Set up an auction, run it live, and wrap up unsold players.',
    body: [
      {
        heading: 'Auction Setup (before going live)',
        steps: [
          'Set the bid increment — the minimum amount each new bid must beat the current bid by.',
          'Add players one at a time, or bulk-import with the CSV box: one player per line, formatted "name, position, basePrice".',
          'Register each Team Manager with a team name and an initial token purse. They must already have a "Team Manager" account (ask an Admin to create/promote one if they don’t show up in the dropdown).',
          'Click "Go live" once you have at least one player and one team registered.',
        ],
      },
      {
        heading: 'Running the live auction',
        steps: [
          'Pick a player from the "Next up" queue and click "Start" to put them on the block.',
          'Optionally start the countdown timer — it’s synced, so Team Managers and Viewers see the same clock.',
          'Watch the current bid and bidder update live as Team Managers bid.',
          '"Mark sold" awards the player to the current highest bidder and deducts their purse. "Mark unsold" clears the player with no winner.',
          'Click "End auction" when every player has been sold or passed — anyone left in the queue is automatically marked unsold at this point.',
        ],
      },
      {
        heading: 'After the auction ends',
        steps: [
          'Open "Results" to see final team squads, sold players, and anyone still unsold.',
          'Assign a leftover unsold player directly to a team at base price from the Unsold players list — team squads update immediately.',
        ],
      },
    ],
  },
  {
    id: 'manager',
    label: 'Team Manager',
    summary: 'Place bids and track your team’s remaining budget.',
    body: [
      {
        heading: 'Placing bids',
        steps: [
          'You need to be registered to an auction by its Auction Manager before you can bid — ask them to add you during Setup.',
          'Your remaining token balance is shown at the top of the bidding screen.',
          'The bid button always shows the next valid amount (current bid + increment). Click it to place that bid.',
          'The button is disabled if you’re already the highest bidder, you don’t have enough tokens left, or the auction isn’t live.',
          'Tokens are only deducted once the Auction Manager marks a player "sold" to you — an active bid reserves nothing in advance.',
        ],
      },
    ],
  },
  {
    id: 'player',
    label: 'Player',
    summary: 'What it means to be up for auction.',
    body: [
      {
        heading: 'Being auctioned',
        steps: [
          'A Viewer can request to become a Player, or an Admin/Auction Manager/Team Manager can promote one directly.',
          'Once you’re a registered Player in an auction’s roster, you’ll be put on the block for Team Managers to bid on.',
          'You can watch your own auction the same way a Viewer does, from the "Watch" link on your Home page.',
        ],
      },
    ],
  },
  {
    id: 'viewer',
    label: 'Viewer',
    summary: 'Watch an auction live — no account required.',
    body: [
      {
        heading: 'Watching an auction',
        steps: [
          'No account needed — click "Join an auction as a viewer" from the sign-in screen and enter the Auction ID you were given.',
          'The live scoreboard shows the current player, the current bid and bidder, and a running bid feed.',
          'Team standings show each team’s spend and remaining tokens as the auction progresses.',
          'Click "Full results" at any time to see final sold/unsold players and team strength once the auction wraps up.',
        ],
      },
    ],
  },
]

export function getHelpSection(id: string | undefined): HelpSection | undefined {
  return helpSections.find((s) => s.id === id)
}
