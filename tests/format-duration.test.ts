import { describe, it, expect } from 'vitest'
import { formatDuration, formatSessionDuration } from '../src/utils/format-duration'

describe('formatDuration', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00')
  })

  it('formats 59 seconds as 00:59', () => {
    expect(formatDuration(59)).toBe('00:59')
  })

  it('formats 60 seconds as 01:00', () => {
    expect(formatDuration(60)).toBe('01:00')
  })

  it('formats 3599 seconds as 59:59', () => {
    expect(formatDuration(3599)).toBe('59:59')
  })

  it('formats 3600 seconds as 1:00:00 (H:MM:SS threshold)', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
  })

  it('formats 3661 seconds as 1:01:01', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('formats 7322 seconds as 2:02:02', () => {
    expect(formatDuration(7322)).toBe('2:02:02')
  })
})

describe('formatSessionDuration', () => {
  it('derives duration from two ISO timestamps', () => {
    const start = '2026-03-18T10:00:00Z'
    const end = '2026-03-18T10:45:30Z'
    expect(formatSessionDuration(start, end)).toBe('45:30')
  })

  it('formats sessions over 1 hour with H:MM:SS', () => {
    const start = '2026-03-18T09:00:00Z'
    const end = '2026-03-18T10:05:10Z'
    expect(formatSessionDuration(start, end)).toBe('1:05:10')
  })
})
