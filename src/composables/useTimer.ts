import { ref, computed } from 'vue'
import { formatDuration } from '../utils/format-duration'

export function useTimer(startedAt: Date) {
  const elapsed = ref(Math.floor((Date.now() - startedAt.getTime()) / 1000))
  const display = computed(() => formatDuration(elapsed.value))

  const interval = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt.getTime()) / 1000)
  }, 1000)

  function stop() {
    clearInterval(interval)
  }

  return { display, stop }
}
