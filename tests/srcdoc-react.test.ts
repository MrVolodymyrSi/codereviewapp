import { describe, it, expect } from 'vitest'
import { buildReactSrcdoc } from '../src/utils/srcdoc-react'
import type { ChallengeFile } from '../src/types/challenge'

describe('buildReactSrcdoc', () => {
  it('includes React and ReactDOM CDN scripts', () => {
    const files: ChallengeFile[] = [{ name: 'App.jsx', language: 'tsx', code: 'function App() { return null; }' }]
    const result = buildReactSrcdoc(files)
    expect(result).toContain('unpkg.com/react@18')
    expect(result).toContain('unpkg.com/react-dom@18')
  })

  it('includes Babel standalone for JSX compilation', () => {
    const files: ChallengeFile[] = [{ name: 'App.jsx', language: 'tsx', code: 'function App() { return null; }' }]
    const result = buildReactSrcdoc(files)
    expect(result).toContain('@babel/standalone')
    expect(result).toContain('text/babel')
  })

  it('renders the component at root', () => {
    const files: ChallengeFile[] = [{ name: 'App.jsx', language: 'tsx', code: 'function App() { return null; }' }]
    const result = buildReactSrcdoc(files)
    expect(result).toContain('ReactDOM.createRoot')
    expect(result).toContain("getElementById('root')")
  })

  it('inlines component code in the babel script', () => {
    const code = `function App() { return <div>hello</div>; }`
    const files: ChallengeFile[] = [{ name: 'App.jsx', language: 'tsx', code }]
    const result = buildReactSrcdoc(files)
    expect(result).toContain(code)
  })

  it('concatenates multiple files in order inside babel script', () => {
    const files: ChallengeFile[] = [
      { name: 'api.js', language: 'javascript', code: 'function fetchData() {}' },
      { name: 'Card.jsx', language: 'tsx', code: 'function Card() { return <div/>; }' },
      { name: 'App.jsx', language: 'tsx', code: 'function App() { return <Card/>; }' },
    ]
    const result = buildReactSrcdoc(files)
    const fetchIdx = result.indexOf('function fetchData')
    const cardIdx = result.indexOf('function Card')
    const appIdx = result.indexOf('function App')
    expect(fetchIdx).toBeLessThan(cardIdx)
    expect(cardIdx).toBeLessThan(appIdx)
  })
})
