import { describe, it, expect } from 'vitest'
import { buildVanillaSrcdoc } from '../src/utils/srcdoc-vanilla'
import type { ChallengeFile } from '../src/types/challenge'

describe('buildVanillaSrcdoc', () => {
  it('wraps code in a full HTML document', () => {
    const files: ChallengeFile[] = [{ name: 'index.html', language: 'html', code: '<div>hello</div>' }]
    const result = buildVanillaSrcdoc(files)
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<div>hello</div>')
  })

  it('includes error handler script', () => {
    const files: ChallengeFile[] = [{ name: 'index.html', language: 'html', code: '' }]
    const result = buildVanillaSrcdoc(files)
    expect(result).toContain('window.onerror')
  })

  it('does not break when code contains </script> literal', () => {
    const files: ChallengeFile[] = [{ name: 'index.html', language: 'html', code: `<script>var x = 1;<\/script>` }]
    const result = buildVanillaSrcdoc(files)
    // should still produce valid-ish output without terminating the wrapper early
    expect(result).toContain('<!DOCTYPE html>')
  })

  it('concatenates multiple js files into a single script block', () => {
    const files: ChallengeFile[] = [
      { name: 'api.js', language: 'javascript', code: 'function fetchData() {}' },
      { name: 'app.js', language: 'javascript', code: 'fetchData();' },
      { name: 'index.html', language: 'html', code: '<div id="app"></div>' },
    ]
    const result = buildVanillaSrcdoc(files)
    expect(result).toContain('function fetchData() {}')
    expect(result).toContain('fetchData();')
    expect(result).toContain('<div id="app"></div>')
    // js code appears after body html
    const htmlIdx = result.indexOf('<div id="app"></div>')
    const jsIdx = result.indexOf('function fetchData')
    expect(jsIdx).toBeGreaterThan(htmlIdx)
  })
})
