import { BATTING_TYPE_LABELS } from '../lib/battingTypes'
import { BOWLING_TYPE_LABELS } from '../lib/bowlingTypes'
import type { BattingType, BowlingType, Handedness } from '../types'

const BATTING_HANDEDNESS_LABELS: Record<Handedness, string> = {
  right: 'Right-handed batsman',
  left: 'Left-handed batsman',
}

const BOWLING_HANDEDNESS_LABELS: Record<Handedness, string> = {
  right: 'Right-arm bowler',
  left: 'Left-arm bowler',
}

function Badge({ children, tone }: { children: string; tone: 'batting' | 'bowling' }) {
  const toneClass =
    tone === 'batting'
      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-600/10 dark:ring-blue-400/20'
      : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-600/10 dark:ring-orange-400/20'
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>{children}</span>
  )
}

// The rest of a linked player's cricket profile (see Player's photo/handedness
// snapshot comment in types/index.ts) rendered as small tinted pills — blue
// for batting, orange for bowling — so viewers/managers can see who's up for
// sale at a glance, beyond just their name and position.
export function PlayerProfileBadges({
  battingHandedness,
  bowlingHandedness,
  battingType,
  bowlingType,
}: {
  battingHandedness?: Handedness | null
  bowlingHandedness?: Handedness | null
  battingType?: BattingType | null
  bowlingType?: BowlingType | null
}) {
  const badges: { key: string; tone: 'batting' | 'bowling'; label: string }[] = []
  if (battingHandedness)
    badges.push({ key: 'bh', tone: 'batting', label: BATTING_HANDEDNESS_LABELS[battingHandedness] })
  if (battingType) badges.push({ key: 'bt', tone: 'batting', label: BATTING_TYPE_LABELS[battingType] })
  if (bowlingHandedness)
    badges.push({ key: 'wh', tone: 'bowling', label: BOWLING_HANDEDNESS_LABELS[bowlingHandedness] })
  if (bowlingType) badges.push({ key: 'wt', tone: 'bowling', label: BOWLING_TYPE_LABELS[bowlingType] })

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <Badge key={b.key} tone={b.tone}>
          {b.label}
        </Badge>
      ))}
    </div>
  )
}
