import { describe, expect, it } from 'vitest'
import { getHelpSection, helpSections } from './helpContent'
import type { UserRole } from '../types'

const everyRole: UserRole[] = ['admin', 'auctionManager', 'manager', 'player', 'viewer']

describe('helpSections', () => {
  it('has a guide for every user role, plus the overview', () => {
    const ids = helpSections.map((s) => s.id)
    for (const role of everyRole) {
      expect(ids).toContain(role)
    }
    expect(ids).toContain('overview')
  })

  it('has unique ids', () => {
    const ids = helpSections.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every section a label, a summary, and at least one content block', () => {
    for (const section of helpSections) {
      expect(section.label.trim()).not.toBe('')
      expect(section.summary.trim()).not.toBe('')
      expect(section.body.length).toBeGreaterThan(0)
      for (const block of section.body) {
        expect(block.heading.trim()).not.toBe('')
        expect(block.steps.length).toBeGreaterThan(0)
        for (const step of block.steps) {
          expect(step.trim()).not.toBe('')
        }
      }
    }
  })
})

describe('getHelpSection', () => {
  it('finds a section by id', () => {
    expect(getHelpSection('admin')?.label).toBe('Admin')
  })

  it('returns undefined for an unknown id', () => {
    expect(getHelpSection('not-a-real-role')).toBeUndefined()
  })

  it('returns undefined when no id is given', () => {
    expect(getHelpSection(undefined)).toBeUndefined()
  })
})
