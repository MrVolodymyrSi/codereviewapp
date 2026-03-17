import { computed } from 'vue'
import { useChallenge } from './useChallenge'
import { buildVanillaSrcdoc } from '../utils/srcdoc-vanilla'
import { buildVueSrcdoc } from '../utils/srcdoc-vue'
import { buildReactSrcdoc } from '../utils/srcdoc-react'

export function useIframeDoc() {
  const { activeVariant, activeFramework } = useChallenge()

  const srcdoc = computed(() => {
    const { code } = activeVariant.value
    switch (activeFramework.value) {
      case 'vanilla':
        return buildVanillaSrcdoc(code)
      case 'vue':
        return buildVueSrcdoc(code)
      case 'react':
        return buildReactSrcdoc(code)
    }
  })

  return { srcdoc }
}
