import { watchEffect, watch, type ComputedRef, type Ref } from 'vue'
import type { Comment } from '../types/comment'

interface Callbacks {
  onGutterClick: (line: number) => void
  onDelete: (id: string) => void
  onSubmit: () => void
  onCancel: () => void
}

const STYLE_ID = 'gc-styles'
const MAX_ZONE_HEIGHT = 200   // px — hard cap per zone

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  // Single-instance assumption: this app renders one CodePane at a time.
  // If multiple instances become possible, replace with a ref-counted guard.
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .gc-glyph-add::before {
      content: '+';
      font-size: 12px;
      font-weight: 700;
      color: #58a6ff;
      cursor: pointer;
      line-height: 1;
    }
    .gc-zone {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 12px 6px 8px;
      background: var(--bg-elevated, #161b22);
      border-left: 3px solid #1f6feb;
      box-sizing: border-box;
      width: 100%;
      pointer-events: auto;
    }
    .gc-avatar {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: #1f6feb;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-family: var(--font-ui, sans-serif);
    }
    .gc-avatar--pending {
      background: var(--bg-surface, #2d333b);
      color: var(--text-muted, #8b949e);
      border: 1px solid var(--border, #30363d);
    }
    .gc-body { flex: 1; min-width: 0; }
    .gc-meta {
      font-family: var(--font-ui, sans-serif);
      font-size: 11px;
      color: var(--text-muted, #8b949e);
      margin-bottom: 2px;
    }
    .gc-meta strong { color: var(--accent, #58a6ff); font-weight: 600; }
    .gc-line-ref { margin-left: 6px; font-family: var(--font-mono, monospace); }
    .gc-text {
      margin: 0;
      font-family: var(--font-ui, sans-serif);
      font-size: 12px;
      color: var(--text-muted, #c9d1d9);
      line-height: 1.45;
      max-height: 120px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .gc-delete {
      background: none;
      border: none;
      color: var(--text-faint, #666);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
      align-self: flex-start;
    }
    .gc-delete:hover { color: var(--danger, #f85149); }
    .gc-form-inner { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .gc-textarea {
      width: 100%;
      min-height: 52px;
      background: var(--bg-input, #0d1117);
      border: 1px solid var(--border, #30363d);
      border-radius: 6px;
      color: var(--text, #c9d1d9);
      font-family: var(--font-ui, sans-serif);
      font-size: 12px;
      padding: 6px 8px;
      resize: vertical;
      box-sizing: border-box;
      outline: none;
    }
    .gc-textarea:focus { border-color: var(--accent, #58a6ff); }
    .gc-form-actions { display: flex; gap: 6px; justify-content: flex-end; }
    .gc-btn-cancel {
      background: transparent;
      border: 1px solid var(--border, #30363d);
      border-radius: 6px;
      color: var(--text-muted, #8b949e);
      cursor: pointer;
      font-family: var(--font-ui, sans-serif);
      font-size: 11px;
      padding: 3px 10px;
    }
    .gc-btn-submit {
      background: var(--accent, #238636);
      border: none;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-family: var(--font-ui, sans-serif);
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
    }
  `
  document.head.appendChild(style)
}

function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove()
}

function measureAndCreateZone(
  editor: any,
  editorContainer: HTMLElement,
  domNode: HTMLElement,
  afterLineNumber: number,
): string {
  // Pass 1: append to live document so CSS (including max-height) is applied,
  // then read offsetHeight — not scrollHeight, which ignores max-height.
  domNode.style.visibility = 'hidden'
  domNode.style.position = 'absolute'
  editorContainer.appendChild(domNode)
  const height = Math.min(domNode.offsetHeight || 60, MAX_ZONE_HEIGHT)
  editorContainer.removeChild(domNode)
  domNode.style.visibility = ''
  domNode.style.position = ''

  // Pass 2: insert with known height
  let zoneId!: string
  editor.changeViewZones((accessor: any) => {
    zoneId = accessor.addZone({ afterLineNumber, heightInPx: height, domNode })
  })
  return zoneId
}

function buildCommentNode(comment: Comment, onDelete: (id: string) => void): HTMLElement {
  const zone = document.createElement('div')
  zone.className = 'gc-zone gc-comment'

  const avatar = document.createElement('div')
  avatar.className = 'gc-avatar'
  avatar.textContent = 'R'

  const body = document.createElement('div')
  body.className = 'gc-body'

  const meta = document.createElement('div')
  meta.className = 'gc-meta'
  const strong = document.createElement('strong')
  strong.textContent = 'Reviewer'
  const lineRef = document.createElement('span')
  lineRef.className = 'gc-line-ref'
  lineRef.textContent = `line ${comment.line}`
  meta.appendChild(strong)
  meta.appendChild(lineRef)

  const text = document.createElement('p')
  text.className = 'gc-text'
  text.textContent = comment.text

  const del = document.createElement('button')
  del.className = 'gc-delete'
  del.setAttribute('aria-label', 'Delete comment')
  del.textContent = '×'
  del.addEventListener('click', () => onDelete(comment.id))

  body.appendChild(meta)
  body.appendChild(text)
  zone.appendChild(avatar)
  zone.appendChild(body)
  zone.appendChild(del)
  return zone
}

function buildFormNode(
  draftText: Ref<string>,
  onSubmit: () => void,
  onCancel: () => void,
): HTMLElement {
  const zone = document.createElement('div')
  zone.className = 'gc-zone gc-form'

  const avatar = document.createElement('div')
  avatar.className = 'gc-avatar gc-avatar--pending'
  avatar.textContent = 'R'

  const inner = document.createElement('div')
  inner.className = 'gc-form-inner'

  const textarea = document.createElement('textarea')
  textarea.className = 'gc-textarea'
  textarea.placeholder = 'Leave a review comment…'
  textarea.addEventListener('input', () => { draftText.value = textarea.value })
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSubmit() }
  })

  const actions = document.createElement('div')
  actions.className = 'gc-form-actions'

  const cancel = document.createElement('button')
  cancel.className = 'gc-btn-cancel'
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', onCancel)

  const submit = document.createElement('button')
  submit.className = 'gc-btn-submit'
  submit.textContent = 'Add comment'
  submit.addEventListener('click', onSubmit)

  actions.appendChild(cancel)
  actions.appendChild(submit)
  inner.appendChild(textarea)
  inner.appendChild(actions)
  zone.appendChild(avatar)
  zone.appendChild(inner)

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => textarea.focus())
  }
  return zone
}

export function useGutterComments(
  comments: ComputedRef<Comment[]>,
  pendingLine: Ref<number | null>,
  draftText: Ref<string>,
  callbacks: Callbacks,
) {
  let editor: any = null
  let editorContainer: HTMLElement | null = null
  let stopCommentWatcher: (() => void) | null = null
  let stopFormWatcher: (() => void) | null = null
  const commentZoneMap = new Map<string, string>()   // commentId → zoneId
  let formZoneId: string | null = null
  let hoverDecorations: string[] = []
  const disposables: Array<{ dispose: () => void }> = []

  function removeZone(zoneId: string): void {
    if (!editor) return
    editor.changeViewZones((accessor: any) => accessor.removeZone(zoneId))
  }

  function init(editorInstance: any, monaco: any): void {
    editor = editorInstance
    editorContainer = editor.getContainerDomNode()

    injectStyles()

    // ── Mouse events ──────────────────────────────────────────────────────
    let hoveredLine: number | null = null

    disposables.push(editor.onMouseMove((e: any) => {
      const line = e.target.position?.lineNumber ?? null
      const isGlyph = e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      const next = isGlyph ? line : null
      if (next === hoveredLine) return
      hoveredLine = next
      hoverDecorations = editor.deltaDecorations(
        hoverDecorations,
        next ? [{
          range: new monaco.Range(next, 1, next, 1),
          options: { glyphMarginClassName: 'gc-glyph-add' },
        }] : [],
      )
    }))

    disposables.push(editor.onMouseLeave(() => {
      if (hoveredLine === null) return
      hoveredLine = null
      hoverDecorations = editor.deltaDecorations(hoverDecorations, [])
    }))

    disposables.push(editor.onMouseDown((e: any) => {
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return
      const line = e.target.position?.lineNumber
      if (line != null) callbacks.onGutterClick(line)
    }))

    // ── Comment zone manager ──────────────────────────────────────────────
    // Read comments.value inside watchEffect to register the reactive dependency.
    stopCommentWatcher = watchEffect(() => {
      const current = comments.value
      const currentIds = new Set(current.map((c) => c.id))

      const toRemove: string[] = []
      for (const [id, zoneId] of commentZoneMap) {
        if (!currentIds.has(id)) {
          removeZone(zoneId)
          toRemove.push(id)
        }
      }
      for (const id of toRemove) commentZoneMap.delete(id)

      for (const comment of current) {
        if (!commentZoneMap.has(comment.id)) {
          const domNode = buildCommentNode(comment, callbacks.onDelete)
          const zoneId = measureAndCreateZone(editor, editorContainer!, domNode, comment.line - 1)
          commentZoneMap.set(comment.id, zoneId)
        }
      }
    })

    // ── Form zone manager ─────────────────────────────────────────────────
    stopFormWatcher = watch(pendingLine, (line) => {
      if (formZoneId !== null) {
        removeZone(formZoneId)
        formZoneId = null
      }
      if (line !== null) {
        const domNode = buildFormNode(draftText, callbacks.onSubmit, callbacks.onCancel)
        formZoneId = measureAndCreateZone(editor, editorContainer!, domNode, line - 1)
      }
    }, { immediate: true })
  }

  function dispose(): void {
    stopCommentWatcher?.()
    stopFormWatcher?.()

    for (const zoneId of commentZoneMap.values()) removeZone(zoneId)
    commentZoneMap.clear()

    if (formZoneId !== null) {
      removeZone(formZoneId)
      formZoneId = null
    }

    if (hoverDecorations.length) {
      editor?.deltaDecorations(hoverDecorations, [])
      hoverDecorations = []
    }

    for (const d of disposables) d.dispose()
    disposables.length = 0

    removeStyles()
    editor = null
    editorContainer = null
  }

  return { init, dispose }
}
