import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTimer } from '../src/composables/useTimer'

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initialises elapsed from startedAt', () => {
    vi.setSystemTime(new Date('2026-03-18T10:02:05Z'))
    const start = new Date('2026-03-18T10:00:00Z') // 2m05s ago
    const { display, stop } = useTimer(start)
    expect(display.value).toBe('02:05')
    stop()
  })

  it('formats under 1 hour as MM:SS', () => {
    vi.setSystemTime(new Date('2026-03-18T10:59:59Z'))
    const start = new Date('2026-03-18T10:00:00Z')
    const { display, stop } = useTimer(start)
    expect(display.value).toBe('59:59')
    stop()
  })

  it('formats 1 hour or more as H:MM:SS', () => {
    vi.setSystemTime(new Date('2026-03-18T11:01:01Z'))
    const start = new Date('2026-03-18T10:00:00Z')
    const { display, stop } = useTimer(start)
    expect(display.value).toBe('1:01:01')
    stop()
  })

  it('increments elapsed every second via setInterval', () => {
    vi.setSystemTime(new Date('2026-03-18T10:01:00Z'))
    const start = new Date('2026-03-18T10:00:00Z')
    const { display, stop } = useTimer(start)
    expect(display.value).toBe('01:00')
    vi.advanceTimersByTime(1000)
    expect(display.value).toBe('01:01')
    vi.advanceTimersByTime(2000)
    expect(display.value).toBe('01:03')
    stop()
  })

  it('stop() halts timer updates', () => {
    vi.setSystemTime(new Date('2026-03-18T10:00:00Z'))
    const start = new Date('2026-03-18T10:00:00Z')
    const { display, stop } = useTimer(start)
    stop()
    vi.advanceTimersByTime(5000)
    expect(display.value).toBe('00:00')
  })
})
