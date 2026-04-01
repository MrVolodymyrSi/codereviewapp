import { watchEffect, watch, type ComputedRef, type Ref } from 'vue'
import type { Comment } from '../types/comment'

interface Callbacks {
  onRangeSelect: (start: number, end: number) => void
  onDelete: (id: string) => void
  onSubmit: () => void
  onCancel: () => void
  onUpdate: (id: string, text: string) => void
}

const STYLE_ID = 'gc-styles'
const MAX_ZONE_HEIGHT = 300

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .gc-glyph-add::before {
      content: '+';
      font-size: 14px;
      font-weight: 700;
      color: #58a6ff;
      cursor: pointer;
      line-height: 1;
    }
    .gc-range-highlight {
      background: rgba(31, 111, 235, 0.15) !important;
    }
    .gc-line-selected {
      border-left: 3px solid #1f6feb;
    }
    .gc-zone {
      box-sizing: border-box;
      width: 100%;
      pointer-events: auto;
      position: relative;
      z-index: 1;
    }
    .gc-comment {
      border: 1px solid var(--border, #30363d);
      border-radius: 6px;
      margin: 4px 8px 4px 0;
      font-family: var(--font-ui, sans-serif);
    }
    .gc-snippet {
      background: var(--bg-elevated, #161b22);
      border-bottom: 1px solid var(--border, #30363d);
      padding: 5px 10px;
      font-family: var(--font-mono, monospace);
      font-size: 11px;
    }
    .gc-snippet-line {
      color: var(--text-muted, #8b949e);
      line-height: 1.6;
      white-space: pre;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .gc-snippet-num {
      display: inline-block;
      width: 28px;
      color: var(--text-faint, #555);
      text-align: right;
      margin-right: 8px;
      user-select: none;
    }
    .gc-header {
      background: var(--bg, #0d1117);
      padding: 6px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid var(--border-subtle, #21262d);
    }
    .gc-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1f6feb;
      color: #fff;
      font-size: 8px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .gc-author {
      font-size: 12px;
      color: var(--text, #e6edf3);
      font-weight: 600;
    }
    .gc-timestamp {
      font-size: 11px;
      color: var(--text-muted, #8b949e);
      margin-left: auto;
    }
    .gc-menu-wrap {
      position: relative;
    }
    .gc-menu-btn {
      background: none;
      border: none;
      color: var(--text-muted, #8b949e);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0 4px;
      letter-spacing: 1px;
    }
    .gc-menu-btn:hover { color: var(--text, #e6edf3); }
    .gc-menu {
      position: absolute;
      right: 0;
      top: 100%;
      background: var(--bg-elevated, #161b22);
      border: 1px solid var(--border, #30363d);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 100;
      min-width: 100px;
      overflow: hidden;
    }
    .gc-menu-item {
      display: block;
      width: 100%;
      background: none;
      border: none;
      color: var(--text, #c9d1d9);
      cursor: pointer;
      font-family: var(--font-ui, sans-serif);
      font-size: 12px;
      padding: 7px 12px;
      text-align: left;
    }
    .gc-menu-item:hover { background: var(--bg-surface, #2d333b); }
    .gc-menu-delete { color: var(--danger, #f85149); }
    .gc-menu-delete:hover { background: rgba(248,81,73,0.1); }
    .gc-body {
      background: var(--bg, #0d1117);
      padding: 8px 10px 10px;
    }
    .gc-text {
      margin: 0;
      font-size: 12px;
      color: var(--text-muted, #c9d1d9);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .gc-form {
      border: 1px solid var(--border, #30363d);
      border-radius: 6px;
      overflow: hidden;
      margin: 4px 8px 4px 0;
      font-family: var(--font-ui, sans-serif);
    }
    .gc-form-header {
      background: var(--bg-elevated, #161b22);
      border-bottom: 1px solid var(--border, #30363d);
      padding: 5px 10px;
      font-size: 11px;
      color: var(--text-muted, #8b949e);
    }
    .gc-form-body {
      background: var(--bg, #0d1117);
      padding: 8px 10px;
    }
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
    .gc-form-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      margin-top: 6px;
    }
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
    .gc-btn-submit, .gc-btn-save {
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
  const contentWidth = editor.getLayoutInfo().contentWidth
  domNode.style.visibility = 'hidden'
  domNode.style.position = 'absolute'
  domNode.style.width = `${contentWidth}px`
  editorContainer.appendChild(domNode)
  const height = Math.min(domNode.offsetHeight || 60, MAX_ZONE_HEIGHT)
  editorContainer.removeChild(domNode)
  domNode.style.visibility = ''
  domNode.style.position = ''
  domNode.style.width = ''

  let zoneId!: string
  editor.changeViewZones((accessor: any) => {
    zoneId = accessor.addZone({ afterLineNumber, heightInPx: height, domNode, suppressMouseDown: true })
  })
  return zoneId
}

function buildSnippet(
  lineStart: number,
  lineEnd: number,
  getLineContent: (n: number) => string,
): HTMLElement {
  const snippet = document.createElement('div')
  snippet.className = 'gc-snippet'
  for (let i = lineStart; i <= lineEnd; i++) {
    const row = document.createElement('div')
    row.className = 'gc-snippet-line'
    const num = document.createElement('span')
    num.className = 'gc-snippet-num'
    num.textContent = String(i)
    row.appendChild(num)
    row.appendChild(document.createTextNode(getLineContent(i)))
    snippet.appendChild(row)
  }
  return snippet
}

function buildCommentNode(
  comment: Comment,
  getLineContent: (n: number) => string,
  onDelete: (id: string) => void,
  onUpdate: (id: string, text: string) => void,
): HTMLElement {
  const zone = document.createElement('div')
  zone.className = 'gc-zone gc-comment'
  zone.addEventListener('mousedown', (e) => e.stopPropagation())

  zone.appendChild(buildSnippet(comment.lineStart, comment.lineEnd, getLineContent))

  const header = document.createElement('div')
  header.className = 'gc-header'

  const avatar = document.createElement('div')
  avatar.className = 'gc-avatar'
  avatar.textContent = 'R'

  const author = document.createElement('strong')
  author.className = 'gc-author'
  author.textContent = 'Reviewer'

  const timestamp = document.createElement('span')
  timestamp.className = 'gc-timestamp'
  timestamp.textContent = relativeTime(comment.timestamp)

  const menuWrap = document.createElement('div')
  menuWrap.className = 'gc-menu-wrap'

  const menuBtn = document.createElement('button')
  menuBtn.className = 'gc-menu-btn'
  menuBtn.setAttribute('aria-label', 'Comment actions')
  menuBtn.textContent = '···'

  const menu = document.createElement('div')
  menu.className = 'gc-menu'
  menu.hidden = true

  const editItem = document.createElement('button')
  editItem.className = 'gc-menu-item gc-menu-edit'
  editItem.textContent = 'Edit'

  const deleteItem = document.createElement('button')
  deleteItem.className = 'gc-menu-item gc-menu-delete'
  deleteItem.textContent = 'Delete'

  menu.appendChild(editItem)
  menu.appendChild(deleteItem)
  menuWrap.appendChild(menuBtn)
  menuWrap.appendChild(menu)

  header.appendChild(avatar)
  header.appendChild(author)
  header.appendChild(timestamp)
  header.appendChild(menuWrap)

  const body = document.createElement('div')
  body.className = 'gc-body'

  const textNode = document.createElement('p')
  textNode.className = 'gc-text'
  textNode.textContent = comment.text
  body.appendChild(textNode)

  zone.appendChild(header)
  zone.appendChild(body)

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    menu.hidden = !menu.hidden
    if (!menu.hidden) {
      const closeMenu = (ev: MouseEvent) => {
        if (!menuWrap.contains(ev.target as Node)) {
          menu.hidden = true
          document.removeEventListener('mousedown', closeMenu)
        }
      }
      document.addEventListener('mousedown', closeMenu)
    }
  })

  deleteItem.addEventListener('click', () => {
    menu.hidden = true
    onDelete(comment.id)
  })

  editItem.addEventListener('click', () => {
    menu.hidden = true
    body.innerHTML = ''

    const editArea = document.createElement('textarea')
    editArea.className = 'gc-textarea'
    editArea.value = comment.text

    const actions = document.createElement('div')
    actions.className = 'gc-form-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'gc-btn-cancel'
    cancelBtn.textContent = 'Cancel'

    const saveBtn = document.createElement('button')
    saveBtn.className = 'gc-btn-save'
    saveBtn.textContent = 'Save'

    actions.appendChild(cancelBtn)
    actions.appendChild(saveBtn)
    body.appendChild(editArea)
    body.appendChild(actions)
    requestAnimationFrame(() => editArea.focus())

    cancelBtn.addEventListener('click', () => {
      body.innerHTML = ''
      body.appendChild(textNode)
    })

    saveBtn.addEventListener('click', () => {
      const newText = editArea.value.trim()
      if (newText) {
        textNode.textContent = newText
        onUpdate(comment.id, newText)
      }
      body.innerHTML = ''
      body.appendChild(textNode)
    })
  })

  return zone
}

function buildFormNode(
  lineStart: number,
  lineEnd: number,
  draftText: Ref<string>,
  onSubmit: () => void,
  onCancel: () => void,
): HTMLElement {
  const zone = document.createElement('div')
  zone.className = 'gc-zone gc-form'
  zone.addEventListener('mousedown', (e) => e.stopPropagation())

  const formHeader = document.createElement('div')
  formHeader.className = 'gc-form-header'
  formHeader.textContent = lineStart === lineEnd
    ? `Commenting on line ${lineStart}`
    : `Commenting on lines ${lineStart}–${lineEnd}`

  const formBody = document.createElement('div')
  formBody.className = 'gc-form-body'

  const textarea = document.createElement('textarea')
  textarea.className = 'gc-textarea'
  textarea.placeholder = 'Leave a comment…'
  textarea.addEventListener('input', () => { draftText.value = textarea.value })
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSubmit() }
  })

  const actions = document.createElement('div')
  actions.className = 'gc-form-actions'

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'gc-btn-cancel'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', onCancel)

  const submitBtn = document.createElement('button')
  submitBtn.className = 'gc-btn-submit'
  submitBtn.textContent = 'Add comment'
  submitBtn.addEventListener('click', onSubmit)

  actions.appendChild(cancelBtn)
  actions.appendChild(submitBtn)
  formBody.appendChild(textarea)
  formBody.appendChild(actions)
  zone.appendChild(formHeader)
  zone.appendChild(formBody)

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => textarea.focus())
  }
  return zone
}

export function useGutterComments(
  comments: ComputedRef<Comment[]>,
  pendingRange: Ref<{ start: number; end: number } | null>,
  draftText: Ref<string>,
  callbacks: Callbacks,
  getLineContent: (line: number) => string,
) {
  let editor: any = null
  let editorContainer: HTMLElement | null = null
  let stopCommentWatcher: (() => void) | null = null
  let stopFormWatcher: (() => void) | null = null
  const commentZoneMap = new Map<string, string>()
  let formZoneId: string | null = null
  let hoverDecorations: string[] = []
  let rangeDecorations: string[] = []
  const disposables: Array<{ dispose: () => void }> = []

  let dragStart: number | null = null
  let isDragging = false
  let lastHoveredLine: number | null = null

  function removeZone(zoneId: string): void {
    if (!editor) return
    editor.changeViewZones((accessor: any) => accessor.removeZone(zoneId))
  }

  function onMouseUp() {
    if (!isDragging || dragStart === null) return
    isDragging = false
    const end = lastHoveredLine ?? dragStart
    const start = Math.min(dragStart, end)
    const finalEnd = Math.max(dragStart, end)
    dragStart = null
    if (editor) rangeDecorations = editor.deltaDecorations(rangeDecorations, [])
    callbacks.onRangeSelect(start, finalEnd)
  }

  function init(editorInstance: any, monaco: any): void {
    editor = editorInstance
    editorContainer = editor.getContainerDomNode()

    injectStyles()
    window.addEventListener('mouseup', onMouseUp)

    disposables.push(editor.onMouseMove((e: any) => {
      const isLineNum = e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      const line = e.target.position?.lineNumber ?? null
      lastHoveredLine = line

      hoverDecorations = editor.deltaDecorations(
        hoverDecorations,
        isLineNum && line ? [{
          range: new monaco.Range(line, 1, line, 1),
          options: { glyphMarginClassName: 'gc-glyph-add' },
        }] : [],
      )

      if (isDragging && dragStart !== null && line !== null) {
        const start = Math.min(dragStart, line)
        const end = Math.max(dragStart, line)
        rangeDecorations = editor.deltaDecorations(rangeDecorations, [{
          range: new monaco.Range(start, 1, end, 1),
          options: {
            isWholeLine: true,
            className: 'gc-range-highlight',
            linesDecorationsClassName: 'gc-line-selected',
          },
        }])
      }
    }))

    disposables.push(editor.onMouseLeave(() => {
      lastHoveredLine = null
      hoverDecorations = editor.deltaDecorations(hoverDecorations, [])
    }))

    disposables.push(editor.onMouseDown((e: any) => {
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) return
      const line = e.target.position?.lineNumber
      if (line == null) return
      dragStart = line
      isDragging = true
      lastHoveredLine = line
    }))

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
          const domNode = buildCommentNode(comment, getLineContent, callbacks.onDelete, callbacks.onUpdate)
          const zoneId = measureAndCreateZone(editor, editorContainer!, domNode, comment.lineEnd - 1)
          commentZoneMap.set(comment.id, zoneId)
        }
      }
    })

    stopFormWatcher = watch(pendingRange, (range) => {
      if (formZoneId !== null) {
        removeZone(formZoneId)
        formZoneId = null
      }
      if (range !== null) {
        const domNode = buildFormNode(range.start, range.end, draftText, callbacks.onSubmit, callbacks.onCancel)
        formZoneId = measureAndCreateZone(editor, editorContainer!, domNode, range.end - 1)
      }
    }, { immediate: true })
  }

  function dispose(): void {
    window.removeEventListener('mouseup', onMouseUp)
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
    if (rangeDecorations.length) {
      editor?.deltaDecorations(rangeDecorations, [])
      rangeDecorations = []
    }

    for (const d of disposables) d.dispose()
    disposables.length = 0

    removeStyles()
    editor = null
    editorContainer = null
  }

  return { init, dispose }
}
