export type Framework = 'vue' | 'react' | 'vanilla'

export interface ChallengeFile {
  name: string
  code: string
  language: string
}

export interface ChallengeVariant {
  files: ChallengeFile[]
}

export interface ChallengeBug {
  title: string
  explanation: string
}

export interface Challenge {
  id: string
  title: string
  description: string
  bugs: ChallengeBug[]
  variants: Record<Framework, ChallengeVariant>
}
