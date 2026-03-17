export type Framework = 'vue' | 'react' | 'vanilla'

export interface ChallengeVariant {
  code: string
  language: 'vue' | 'tsx' | 'html'
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
