import { describe, it, expect } from 'vitest'
import { buildVueSrcdoc } from '../src/utils/srcdoc-vue'

describe('buildVueSrcdoc', () => {
  it('includes Vue CDN script', () => {
    const result = buildVueSrcdoc('{}')
    expect(result).toContain('unpkg.com/vue@3')
  })

  it('mounts the component code', () => {
    const code = `{ template: '<div>hi</div>', data() { return {} } }`
    const result = buildVueSrcdoc(code)
    expect(result).toContain('Vue.createApp')
    expect(result).toContain(code)
  })

  it('includes error handling', () => {
    const result = buildVueSrcdoc('{}')
    expect(result).toContain('window.onerror')
    expect(result).toContain('try {')
  })

  it('wraps componentCode in a call expression', () => {
    const result = buildVueSrcdoc('{ template: `<span>x</span>` }')
    expect(result).toContain('Vue.createApp(App)')
  })
})
