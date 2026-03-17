import { shallowRef, ref } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'

// Singleton — shared across all component instances and HMR reloads
const highlighter = shallowRef<Highlighter | null>(null)
const isReady = ref(false)

let initPromise: Promise<void> | null = null

export function useHighlighter() {
  if (!initPromise) {
    initPromise = createHighlighter({
      themes: ['github-dark'],
      langs: ['vue', 'tsx', 'html', 'javascript', 'typescript'],
    }).then((h) => {
      highlighter.value = h
      isReady.value = true
    })
  }

  function highlight(code: string, lang: string): string {
    if (!highlighter.value) return `<pre><code>${escapeHtml(code)}</code></pre>`
    return highlighter.value.codeToHtml(code, {
      lang,
      theme: 'github-dark',
    })
  }

  return { highlight, isReady }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
