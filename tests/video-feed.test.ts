import { describe, it, expect } from 'vitest'
import { videoFeed } from '../src/data/video-feed'

describe('videoFeed challenge', () => {
  it('has the correct id and title', () => {
    expect(videoFeed.id).toBe('video-feed')
    expect(videoFeed.title).toBeDefined()
  })

  describe('Vue variant', () => {
    const variant = videoFeed.variants.vue

    it('has 4 files', () => {
      expect(variant.files).toHaveLength(4)
    })

    it('files are api.js, VideoCard.vue, VideoFeed.vue, App.vue', () => {
      const names = variant.files.map((f) => f.name)
      expect(names).toEqual(['api.js', 'VideoCard.vue', 'VideoFeed.vue', 'App.vue'])
    })

    it('VideoFeed.vue watch has immediate: true so feed loads on mount', () => {
      const feedFile = variant.files.find((f) => f.name === 'VideoFeed.vue')!
      expect(feedFile.code).toContain('immediate: true')
    })

    it('App.vue stores handler and cleans up in beforeUnmount', () => {
      const appFile = variant.files.find((f) => f.name === 'App.vue')!
      expect(appFile.code).toContain('mounted')
      expect(appFile.code).toContain('addEventListener')
      expect(appFile.code).toContain('beforeUnmount')
    })
  })

  describe('React variant', () => {
    const variant = videoFeed.variants.react

    it('has 5 files', () => {
      expect(variant.files).toHaveLength(5)
    })

    it('files are api.js, style.css, VideoCard.jsx, VideoFeed.jsx, App.jsx', () => {
      const names = variant.files.map((f) => f.name)
      expect(names).toEqual(['api.js', 'style.css', 'VideoCard.jsx', 'VideoFeed.jsx', 'App.jsx'])
    })

    it('VideoFeed.jsx useEffect has page in dependency array', () => {
      const feedFile = variant.files.find((f) => f.name === 'VideoFeed.jsx')!
      expect(feedFile.code).toContain('}, [page])')
    })

    it('App.jsx cleanup removes the original handler reference', () => {
      const appFile = variant.files.find((f) => f.name === 'App.jsx')!
      expect(appFile.code).toContain('removeEventListener')
      expect(appFile.code).toContain('const handler')
      expect(appFile.code).toContain("removeEventListener('keydown', handler)")
    })
  })

  describe('Vanilla variant', () => {
    const variant = videoFeed.variants.vanilla

    it('has 3 files', () => {
      expect(variant.files).toHaveLength(3)
    })

    it('files are api.js, video-feed.js, index.html', () => {
      const names = variant.files.map((f) => f.name)
      expect(names).toEqual(['api.js', 'video-feed.js', 'index.html'])
    })

    it('video-feed.js uses a generation counter to discard stale responses', () => {
      const feedFile = variant.files.find((f) => f.name === 'video-feed.js')!
      expect(feedFile.code).toContain('loadGen')
    })

    it('video-feed.js removes the keydown listener in closeModal', () => {
      const feedFile = variant.files.find((f) => f.name === 'video-feed.js')!
      const closeModalIdx = feedFile.code.indexOf('function closeModal')
      const removeListenerIdx = feedFile.code.indexOf('removeEventListener', closeModalIdx)
      expect(closeModalIdx).toBeGreaterThan(-1)
      expect(removeListenerIdx).toBeGreaterThan(closeModalIdx)
    })
  })
})
