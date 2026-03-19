<script setup lang="ts">
import loader from '@monaco-editor/loader'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{ code: string; language: string; theme?: string }>()
const emit = defineEmits<{ change: [string] }>()

const container = ref<HTMLDivElement | null>(null)
let editor: any = null
let monacoInstance: any = null

const langMap: Record<string, string> = {
  vue: 'html', tsx: 'javascript', html: 'html', javascript: 'javascript',
}

onMounted(async () => {
  monacoInstance = await loader.init()
  editor = monacoInstance.editor.create(container.value!, {
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
  editor.onDidChangeModelContent(() => emit('change', editor.getValue()))
})

watch(() => props.code, (val) => {
  if (editor && editor.getValue() !== val) editor.setValue(val)
})

watch(() => props.language, (lang) => {
  if (editor && monacoInstance) {
    monacoInstance.editor.setModelLanguage(editor.getModel(), langMap[lang] ?? lang)
  }
})

watch(() => props.theme, (t) => {
  if (monacoInstance) monacoInstance.editor.setTheme(t ?? 'vs-dark')
})

onBeforeUnmount(() => editor?.dispose())
</script>

<template><div ref="container" style="width:100%;height:100%" /></template>
