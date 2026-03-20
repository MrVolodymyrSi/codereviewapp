<script setup lang="ts">
import loader from '@monaco-editor/loader'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{ code: string; language: string; theme?: 'vs-dark' | 'vs' }>()
const emit = defineEmits<{ change: [string]; gutterClick: [number] }>()

const container = ref<HTMLDivElement | null>(null)
const editor = ref<any>(null)
const monacoInstance = ref<any>(null)

const langMap: Record<string, string> = {
  vue: 'html', tsx: 'javascript', html: 'html', javascript: 'javascript',
}

onMounted(async () => {
  monacoInstance.value = await loader.init()
  editor.value = monacoInstance.value.editor.create(container.value!, {
    value: props.code,
    language: langMap[props.language] ?? props.language,
    theme: props.theme ?? 'vs-dark',
    fontSize: 13,
    fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 8 },
  })
  editor.value.onDidChangeModelContent(() => emit('change', editor.value.getValue()))
  editor.value.onMouseDown((e: any) => {
    const { MouseTargetType } = monacoInstance.value.editor
    if (
      e.target.type === MouseTargetType.GUTTER_LINE_NUMBERS ||
      e.target.type === MouseTargetType.GUTTER_GLYPH_MARGIN ||
      e.target.type === MouseTargetType.GUTTER_LINE_DECORATIONS
    ) {
      const line = e.target.position?.lineNumber ?? null
      if (line) emit('gutterClick', line)
    }
  })
})

watch(() => props.code, (val) => {
  if (editor.value && editor.value.getValue() !== val) editor.value.setValue(val)
})

watch(() => props.language, (lang) => {
  if (editor.value && monacoInstance.value)
    monacoInstance.value.editor.setModelLanguage(editor.value.getModel(), langMap[lang] ?? lang)
})

watch(() => props.theme, (t) => {
  if (monacoInstance.value) monacoInstance.value.editor.setTheme(t ?? 'vs-dark')
})

onBeforeUnmount(() => editor.value?.dispose())

defineExpose({ editor, monacoInstance })
</script>

<template><div ref="container" style="width:100%;height:100%" /></template>
