export type Framework = 'vue' | 'react' | 'vanilla'

export interface ChallengeFile {
  name: string
  code: string
  language: string
}

export interface ChallengeVariant {
  files: ChallengeFile[]
}

export type BugSeverity = 'low' | 'medium' | 'high'

export interface ChallengeBug {
  id: string
  line: number
  file: string
  description: string
  severity: BugSeverity
  variant?: Framework
}

export interface Challenge {
  id: string
  title: string
  description: string
  bugs: ChallengeBug[]
  variants: Record<Framework, ChallengeVariant>
}
