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

describe('generateSummaryMarkdown — Review Comments block', () => {
  it('includes ## Review Comments heading', () => {
    const md = generateSummaryMarkdown(session, 'User Profile Fetcher', bugs)
    expect(md).toContain('## Review Comments')
  })

  it('shows placeholder when comments is null', () => {
    const md = generateSummaryMarkdown(
      { ...session, comments: null },
      'User Profile Fetcher',
      bugs,
    )
    expect(md).toContain('## Review Comments')
    expect(md).toContain('_No comments recorded._')
  })

  it('shows placeholder when comments is empty array', () => {
    const md = generateSummaryMarkdown(
      { ...session, comments: [] },
      'User Profile Fetcher',
      bugs,
    )
    expect(md).toContain('## Review Comments')
    expect(md).toContain('_No comments recorded._')
  })

  it('renders a comment in the correct format', () => {
    const md = generateSummaryMarkdown(
      {
        ...session,
        comments: [
          { id: 'c1', file: 'App.vue', line: 12, text: 'This variable is unused.', timestamp: 1 },
        ],
      },
      'User Profile Fetcher',
      bugs,
    )
    expect(md).toContain('- `App.vue` L12: This variable is unused.')
  })

  it('renders multiple comments sorted by file then line', () => {
    const md = generateSummaryMarkdown(
      {
        ...session,
        comments: [
          { id: 'c3', file: 'App.vue', line: 34, text: 'Consider extracting to a helper.', timestamp: 3 },
          { id: 'c2', file: 'App.vue', line: 12, text: 'This variable is unused.', timestamp: 2 },
          { id: 'c1', file: 'Beta.vue', line: 5, text: 'Missing null check.', timestamp: 1 },
        ],
      },
      'User Profile Fetcher',
      bugs,
    )
    const appLine12 = md.indexOf('- `App.vue` L12:')
    const appLine34 = md.indexOf('- `App.vue` L34:')
    const betaLine5 = md.indexOf('- `Beta.vue` L5:')
    expect(appLine12).toBeLessThan(appLine34)
    expect(appLine34).toBeLessThan(betaLine5)
  })

  it('sorts comments by file (localeCompare) before line number', () => {
    const md = generateSummaryMarkdown(
      {
        ...session,
        comments: [
          { id: 'c1', file: 'Z.vue', line: 1, text: 'Last file.', timestamp: 1 },
          { id: 'c2', file: 'A.vue', line: 99, text: 'First file.', timestamp: 2 },
        ],
      },
      'User Profile Fetcher',
      bugs,
    )
    const aIdx = md.indexOf('- `A.vue`')
    const zIdx = md.indexOf('- `Z.vue`')
    expect(aIdx).toBeLessThan(zIdx)
  })
})
