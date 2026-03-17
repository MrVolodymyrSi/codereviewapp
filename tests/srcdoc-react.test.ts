import { describe, it, expect } from 'vitest'
import { buildReactSrcdoc } from '../src/utils/srcdoc-react'

describe('buildReactSrcdoc', () => {
  it('includes React and ReactDOM CDN scripts', () => {
    const result = buildReactSrcdoc('function App() { return null; }')
    expect(result).toContain('unpkg.com/react@18')
    expect(result).toContain('unpkg.com/react-dom@18')
  })

  it('includes Babel standalone for JSX compilation', () => {
    const result = buildReactSrcdoc('function App() { return null; }')
    expect(result).toContain('@babel/standalone')
    expect(result).toContain('text/babel')
  })

  it('renders the component at root', () => {
    const result = buildReactSrcdoc('function App() { return null; }')
    expect(result).toContain('ReactDOM.createRoot')
    expect(result).toContain("getElementById('root')")
  })

  it('inlines component code in the babel script', () => {
    const code = `function App() { return <div>hello</div>; }`
    const result = buildReactSrcdoc(code)
    expect(result).toContain(code)
  })
})
