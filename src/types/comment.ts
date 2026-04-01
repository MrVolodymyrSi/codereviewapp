export interface Comment {
  id: string
  file: string
  lineStart: number
  lineEnd: number
  text: string
  timestamp: number
  updatedAt?: number
}
