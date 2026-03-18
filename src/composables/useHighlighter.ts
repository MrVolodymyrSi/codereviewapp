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

  function tokenize(code: string, lang: string) {
    if (!highlighter.value) return null
    const result = highlighter.value.codeToTokens(code, {
      lang,
      theme: 'github-dark',
    })
    // Pre-build per-line HTML strings so CodePane can use v-html (same path
    // as codeToHtml — avoids Vue style-binding quirks with hex colors).
    const lines = result.tokens.map((lineTokens) =>
      lineTokens
        .map((token) => {
          const fs = token.fontStyle ?? 0
          let style = ''
          if (token.color) style += `color:${token.color};`
          if (fs & 1) style += 'font-style:italic;'
          if (fs & 2) style += 'font-weight:bold;'
          if (fs & 4) style += 'text-decoration:underline line-through;'
          const safe = token.content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          return style ? `<span style="${style}">${safe}</span>` : safe
        })
        .join(''),
    )
    return { lines, bg: result.bg, fg: result.fg }
  }

  return { highlight, tokenize, isReady }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
