import { describe, it, expect } from 'vitest'
import { buildVueSrcdoc } from '../src/utils/srcdoc-vue'
import type { ChallengeFile } from '../src/types/challenge'

describe('buildVueSrcdoc', () => {
  it('includes Vue CDN script', () => {
    const files: ChallengeFile[] = [{ name: 'App.vue', language: 'vue', code: '<template><div/></template>\n<script>export default {}<\/script>' }]
    const result = buildVueSrcdoc(files)
    expect(result).toContain('unpkg.com/vue@3')
  })

  it('mounts the component code', () => {
    const code = '<template><div>hi</div></template>\n<script>export default { data() { return {} } }<\/script>'
    const files: ChallengeFile[] = [{ name: 'App.vue', language: 'vue', code }]
    const result = buildVueSrcdoc(files)
    expect(result).toContain('Vue.createApp')
    expect(result).toContain('Object.assign(')
  })

  it('includes error handling', () => {
    const files: ChallengeFile[] = [{ name: 'App.vue', language: 'vue', code: '<template><div/></template>\n<script>export default {}<\/script>' }]
    const result = buildVueSrcdoc(files)
    expect(result).toContain('window.onerror')
    expect(result).toContain('try {')
  })

  it('wraps componentCode in a call expression', () => {
    const files: ChallengeFile[] = [{ name: 'App.vue', language: 'vue', code: '<template><span>x</span></template>\n<script>export default {}<\/script>' }]
    const result = buildVueSrcdoc(files)
    expect(result).toContain('Vue.createApp(App)')
  })

  it('injects js files verbatim and assigns vue files to named vars', () => {
    const files: ChallengeFile[] = [
      { name: 'api.js', language: 'javascript', code: 'function fetchVideos(page) {}' },
      { name: 'VideoCard.vue', language: 'vue', code: '<template><div/></template>\n<script>export default {}<\/script>' },
      { name: 'App.vue', language: 'vue', code: '<template><div/></template>\n<script>export default { components: { VideoCard } }<\/script>' },
    ]
    const result = buildVueSrcdoc(files)
    expect(result).toContain('function fetchVideos(page) {}')
    expect(result).toContain('var VideoCard = Object.assign(')
    expect(result).toContain('var App = Object.assign(')
    expect(result).toContain('Vue.createApp(App).mount')
  })
})
