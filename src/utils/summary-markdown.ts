import type { SessionRow } from '../types/session'
import type { ChallengeBug } from '../types/challenge'
import { formatSessionDuration } from './format-duration'

export interface BugWithChecked extends ChallengeBug {
  checked: boolean
}

export function generateSummaryMarkdown(
  session: SessionRow,
  challengeTitle: string,
  bugs: BugWithChecked[],
): string {
  const date = new Date(session.started_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const duration = session.ended_at
    ? formatSessionDuration(session.started_at, session.ended_at)
    : 'in progress'
  const checkedCount = bugs.filter((b) => b.checked).length
  const bugLines = bugs
    .map((b) => `- [${b.checked ? 'x' : ' '}] ${b.description} (${b.severity.toUpperCase()})`)
    .join('\n')
  const commentLines = (session.comments ?? [])
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
    .map(c => `- \`${c.file}\` L${c.line}: ${c.text}`)
    .join('\n')

  return [
    `# Interview — ${session.candidate_name}`,
    `Date: ${date} · Duration: ${duration}`,
    `Challenge: ${challengeTitle} (${session.framework})`,
    '',
    `## Bugs: ${checkedCount}/${session.total_bugs}`,
    bugLines,
    '',
    '## Notes',
    session.notes || '_No notes recorded._',
    '',
    '## Review Comments',
    commentLines || '_No comments recorded._',
  ].join('\n')
}
