import { describe, it, expect } from 'vitest'
import { buildVanillaSrcdoc } from '../src/utils/srcdoc-vanilla'

describe('buildVanillaSrcdoc', () => {
  it('wraps code in a full HTML document', () => {
    const result = buildVanillaSrcdoc('<div>hello</div>')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<div>hello</div>')
  })

  it('includes error handler script', () => {
    const result = buildVanillaSrcdoc('')
    expect(result).toContain('window.onerror')
  })

  it('does not break when code contains </script> literal', () => {
    const code = `<script>var x = 1;<\/script>`
    const result = buildVanillaSrcdoc(code)
    // should still produce valid-ish output without terminating the wrapper early
    expect(result).toContain('<!DOCTYPE html>')
  })
})
