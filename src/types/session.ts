export type SessionRole = 'interviewer' | 'candidate'

export interface SessionRow {
  id: string
  candidate_name: string
  challenge_id: string
  framework: string
  notes: string
  bugs_checked: string[]
  total_bugs: number
  started_at: string   // ISO 8601 from Postgres
  ended_at: string | null
  expires_at: string
}
