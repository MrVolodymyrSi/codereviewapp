export interface Comment {
  id: string
  file: string       // filename only, e.g. "App.vue"
  line: number
  text: string
  timestamp: number
  updatedAt?: number
}
