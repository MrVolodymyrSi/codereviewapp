import { ref, computed } from 'vue'
import { challenges } from '../data'
import type { Framework } from '../types/challenge'

// Module-level state persists across HMR hot reloads
const activeChallengeId = ref<string>(challenges[0].id)
const activeFramework = ref<Framework>('vue')

export function useChallenge() {
  const activeChallenge = computed(
    () => challenges.find((c) => c.id === activeChallengeId.value)!
  )

  const activeVariant = computed(
    () => activeChallenge.value.variants[activeFramework.value]
  )

  function setChallenge(id: string) {
    activeChallengeId.value = id
  }

  function setFramework(fw: Framework) {
    activeFramework.value = fw
  }

  return {
    challenges,
    activeChallengeId,
    activeFramework,
    activeChallenge,
    activeVariant,
    setChallenge,
    setFramework,
  }
}
