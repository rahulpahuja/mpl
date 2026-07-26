import { useState } from 'react'
import type { UserRole } from '../types'

interface HelpSection {
  id: UserRole | 'overview'
  label: string
  body: { heading: string; steps: string[] }[]
}

const sections: HelpSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    body: [
      {
        heading: 'What this app does',
        steps: [
          'Runs a live player auction: an Auction Manager puts players up one at a time, Team Managers bid tokens from a fixed purse, and everyone else can watch live.',
          'Four roles: Admin (sets up auctions and users), Auction Manager (runs the live auction), Team Manager (bids), and Viewer (watches, no account needed).',
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
          'Use the Setup / Manage / Results links next to an auction to configure it, run it live, or see outcomes.',
          'In the Users table, change anyone’s role, and assign Team Managers or Auction Managers to a specific auction.',
        ],
      },
    ],
  },
  {
    id: 'auctionManager',
    label: 'Auction Manager',
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
          'Click "End auction" when every player has been sold or passed.',
        ],
      },
    ],
  },
  {
    id: 'manager',
    label: 'Team Manager',
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
    id: 'viewer',
    label: 'Viewer',
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

export function HelpModal({
  onClose,
  defaultSection,
}: {
  onClose: () => void
  defaultSection: UserRole | 'overview'
}) {
  const [activeId, setActiveId] = useState<HelpSection['id']>(defaultSection)
  const active = sections.find((s) => s.id === activeId) ?? sections[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            How to use Auction Manager
          </h2>
          <button
            onClick={onClose}
            aria-label="Close help"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 px-6 py-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
                s.id === activeId
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {active.body.map((block) => (
            <div key={block.heading}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {block.heading}
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
                {block.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
