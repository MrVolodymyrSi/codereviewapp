import { ref, computed, reactive } from 'vue'
import { challenges } from '../data'
import type { Framework, ChallengeFile } from '../types/challenge'

// Module-level state persists across HMR hot reloads
const activeChallengeId = ref<string>(challenges[0].id)
const activeFramework = ref<Framework>('vue')
const activeFileIndex = ref<number>(0)
const editBuffer = reactive<Record<string, string>>({})
const committedCode = reactive<Record<string, string>>({})
const runTrigger = ref(0)

function fileKey(challengeId: string, framework: string, filename: string) {
  return `${challengeId}:${framework}:${filename}`
}

export function useChallenge() {
  const activeChallenge = computed(
    () => challenges.find((c) => c.id === activeChallengeId.value)!
  )

  const activeVariant = computed(
    () => activeChallenge.value.variants[activeFramework.value]
  )

  const activeFile = computed(() => {
    const files = activeVariant.value.files
    const idx = Math.min(activeFileIndex.value, files.length - 1)
    return files[idx]
  })

  const activeKey = computed(() =>
    fileKey(activeChallengeId.value, activeFramework.value, activeFile.value?.name ?? '')
  )

  function getActiveCode(): string {
    return editBuffer[activeKey.value] ?? activeFile.value?.code ?? ''
  }

  function setActiveCode(code: string) {
    editBuffer[activeKey.value] = code
  }

  const isDirty = computed(() => {
    const key = activeKey.value
    const buf = editBuffer[key]
    if (buf === undefined) return false
    const committed = committedCode[key] ?? activeFile.value?.code ?? ''
    return buf !== committed
  })

  function getCommittedFiles(): ChallengeFile[] {
    return activeVariant.value.files.map((f) => {
      const key = fileKey(activeChallengeId.value, activeFramework.value, f.name)
      return { ...f, code: committedCode[key] ?? f.code }
    })
  }

  function commitAndRun() {
    for (const f of activeVariant.value.files) {
      const key = fileKey(activeChallengeId.value, activeFramework.value, f.name)
      committedCode[key] = editBuffer[key] ?? f.code
    }
    runTrigger.value++
  }

  function setChallenge(id: string) {
    activeChallengeId.value = id
    activeFileIndex.value = 0
  }

  function setFramework(fw: Framework) {
    activeFramework.value = fw
    activeFileIndex.value = 0
  }

  function setFileIndex(i: number) {
    activeFileIndex.value = i
  }

  return {
    challenges,
    activeChallengeId,
    activeFramework,
    activeFileIndex,
    activeChallenge,
    activeVariant,
    activeFile,
    runTrigger,
    getActiveCode,
    setActiveCode,
    isDirty,
    getCommittedFiles,
    commitAndRun,
    setChallenge,
    setFramework,
    setFileIndex,
  }
}
