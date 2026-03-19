import { describe, it, expect } from 'vitest'
import { generateSummaryMarkdown } from '../src/utils/summary-markdown'
import type { SessionRow } from '../src/types/session'

const session: SessionRow = {
  id: 'abc12345',
  candidate_name: 'Alice Chen',
  challenge_id: 'fetch-race',
  framework: 'react',
  notes: 'Good understanding of hooks.',
  bugs_checked: ['fr-2'],
  total_bugs: 2,
  started_at: '2026-03-18T10:00:00.000Z',
  ended_at: '2026-03-18T10:45:30.000Z',
  expires_at: '2026-04-17T10:00:00.000Z',
}

const bugs = [
  {
    id: 'fr-1',
    description: 'Missing cleanup in useEffect',
    severity: 'high' as const,
    checked: false,
    file: 'App.jsx',
    line: 1,
    variant: 'react' as const,
  },
  {
    id: 'fr-2',
    description: 'Race condition on fetch',
    severity: 'high' as const,
    checked: true,
    file: 'App.jsx',
    line: 6,
    variant: 'react' as const,
  },
]

describe('generateSummaryMarkdown', () => {
  it('includes candidate name in heading', () => {
    const md = generateSummaryMarkdown(session, 'User Profile Fetcher', bugs)
    expect(md).toContain('# Interview — Alice Chen')
  })

  it('includes challenge title and framework', () => {
    const md = generateSummaryMarkdown(session, 'User Profile Fetcher', bugs)
    expect(md).toContain('Challenge: User Profile Fetcher (react)')
  })

  it('shows checked / total bug count', () => {
    const md = generateSummaryMarkdown(session, 'User Profile Fetcher', bugs)
    expect(md).toContain('## Bugs: 1/2')
  })

  it('marks checked bugs with [x]', () => {
    const md = generateSummaryMarkdown(session, 'User Profile Fetcher', bugs)
    expect(md).toContain('- [x] Race condition on fetch (HIGH)')
  })

  it('marks unchecked bugs with [ ]', () => {
    const md = generateSummaryMarkdown(session, 'User Profile Fetcher', bugs)
    expect(md).toContain('- [ ] Missing cleanup in useEffect (HIGH)')
  })

  it('includes notes content', () => {
    const md = generateSummaryMarkdown(session, 'User Profile Fetcher', bugs)
    expect(md).toContain('Good understanding of hooks.')
  })

  it('formats duration from timestamps', () => {
    const md = generateSummaryMarkdown(session, 'User Profile Fetcher', bugs)
    expect(md).toContain('Duration: 45:30')
  })

  it('uses placeholder when notes are empty', () => {
    const md = generateSummaryMarkdown(
      { ...session, notes: '' },
      'User Profile Fetcher',
      bugs,
    )
    expect(md).toContain('_No notes recorded._')
  })

  it('handles zero bugs gracefully', () => {
    const md = generateSummaryMarkdown(
      { ...session, total_bugs: 0 },
      'User Profile Fetcher',
      [],
    )
    expect(md).toContain('## Bugs: 0/0')
    expect(md).toContain('# Interview — Alice Chen')
  })
})
