import { computed } from 'vue'
import { useChallenge } from './useChallenge'
import { buildVanillaSrcdoc } from '../utils/srcdoc-vanilla'
import { buildVueSrcdoc } from '../utils/srcdoc-vue'
import { buildReactSrcdoc } from '../utils/srcdoc-react'

export function useIframeDoc() {
  const { activeFramework, getCommittedFiles, runTrigger } = useChallenge()

  const srcdoc = computed(() => {
    runTrigger.value // reactive dep — recomputes when Run is clicked
    const files = getCommittedFiles()
    switch (activeFramework.value) {
      case 'vanilla':
        return buildVanillaSrcdoc(files)
      case 'vue':
        return buildVueSrcdoc(files)
      case 'react':
        return buildReactSrcdoc(files)
    }
  })

  return { srcdoc }
}
