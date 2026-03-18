import { describe, it, expect } from 'vitest'
import { MOCK_FETCH_INJECTION } from '../src/utils/mock-api'

describe('MOCK_FETCH_INJECTION', () => {
  it('is an IIFE', () => {
    expect(MOCK_FETCH_INJECTION).toContain('(function()')
    expect(MOCK_FETCH_INJECTION.trim()).toMatch(/\)\(\);?\s*$/)
  })

  it('overrides window.fetch', () => {
    expect(MOCK_FETCH_INJECTION).toContain('window.fetch')
  })

  it('handles /api/videos endpoint', () => {
    expect(MOCK_FETCH_INJECTION).toContain('/api/videos')
  })

  it('handles /api/videos/:id endpoint', () => {
    expect(MOCK_FETCH_INJECTION).toContain('/api/videos/')
  })

  it('contains all 6 mock videos', () => {
    const matches = MOCK_FETCH_INJECTION.match(/\bid:\s*\d+/g) || []
    expect(matches.length).toBe(6)
  })

  it('uses YouTube thumbnails that match the youtubeId of each video', () => {
    expect(MOCK_FETCH_INJECTION).toContain('img.youtube.com/vi/')
    expect(MOCK_FETCH_INJECTION).toContain('mqdefault.jpg')
  })
})
