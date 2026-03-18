export interface ConsoleEntry {
  id: string
  kind: 'console'
  level: 'log' | 'warn' | 'error' | 'info'
  args: string[]
  timestamp: number
}

export interface NetworkEntry {
  id: string
  kind: 'network'
  requestId: string
  method: string
  url: string
  status: number | null
  duration: number | null
  pending: boolean
  timestamp: number
}

export type PanelEntry = ConsoleEntry | NetworkEntry
