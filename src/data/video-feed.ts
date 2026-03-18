import type { Challenge } from '../types/challenge'

const sharedStyles = `
@import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@400;600;700&display=swap');

:root {
  --bg: #111114;
  --surface: #18181d;
  --surface-hover: #1f1f27;
  --border: rgba(255,255,255,0.07);
  --text: #f0f0f5;
  --text-muted: #7a7a90;
  --accent: #f5a623;
  --radius: 10px;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: 'Figtree', sans-serif;
  background: var(--bg);
  color: var(--text);
  margin: 0;
  padding: 1.5rem;
}

h1 {
  font-family: 'Syne', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 1.25rem;
}

/* Cards */
.card {
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 36px rgba(0,0,0,0.5);
  border-color: rgba(245, 166, 35, 0.28);
}

.card-thumb {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.card:hover .card-thumb {
  transform: scale(1.04);
}

.card-body {
  padding: 10px 12px 13px;
}

.card-title {
  font-size: 0.87rem;
  font-weight: 500;
  color: var(--text);
  margin: 0 0 5px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 300;
}

/* Feed grid */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

/* Loading */
.feed-loading {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 300;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 1.25rem;
}

.page-btn {
  background: var(--surface);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 14px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.page-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.page-label {
  font-size: 0.82rem;
  color: var(--text-muted);
  min-width: 3.5rem;
  text-align: center;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(5px);
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-box {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 22px 24px 24px;
  max-width: 520px;
  width: 90%;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(255,255,255,0.07);
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  font-family: 'Figtree', sans-serif;
  padding: 5px 10px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.modal-close:hover {
  background: rgba(255,255,255,0.13);
  color: var(--text);
}

.modal-title {
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 5px;
  padding-right: 4.5rem;
  line-height: 1.4;
}

.modal-channel {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 14px;
  font-weight: 300;
}

.modal-iframe {
  width: 100%;
  height: 268px;
  border-radius: 8px;
  border: none;
  display: block;
}

.modal-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin: 10px 0 0;
  font-style: italic;
  font-weight: 300;
}

.modal-loading {
  color: var(--text-muted);
  font-size: 0.88rem;
  font-style: italic;
  padding: 2.5rem 0;
  text-align: center;
  font-weight: 300;
}
`

export const videoFeed: Challenge = {
  id: 'video-feed',
  title: 'Video Feed',
  description:
    'A paginated video feed that loads thumbnails from an API and opens a modal detail view.',
  bugs: [
    {
      id: 'vf-1',
      file: 'App.vue',
      line: 51,
      description: 'openVideo has no stale guard — clicking a second video while the first fetch is in-flight overwrites selectedVideo with whichever response arrives last',
      severity: 'high',
      variant: 'vue',
    },
    {
      id: 'vf-2',
      file: 'VideoFeed.vue',
      line: 10,
      description: 'Next button has no hasMore check — nextPage() increments the page counter indefinitely even when the API has no more results',
      severity: 'medium',
      variant: 'vue',
    },
    {
      id: 'vf-3',
      file: 'VideoFeed.jsx',
      line: 6,
      description: 'useEffect has no cleanup function — if page changes before fetchVideos resolves, the stale response still calls setVideos and setLoading on the new page',
      severity: 'high',
      variant: 'react',
    },
  ],
  variants: {
    vue: {
      files: [
        {
          name: 'api.js',
          language: 'javascript',
          code: `async function fetchVideos(page) {
  const res = await fetch('/api/videos?page=' + page);
  return res.json();
}`,
        },
        {
          name: 'VideoCard.vue',
          language: 'vue',
          code: `<template>
  <div class="card" @click="$emit('select', video.id)">
    <img class="card-thumb" :src="video.thumbnail" :alt="video.title" />
    <div class="card-body">
      <h3 class="card-title">{{ video.title }}</h3>
      <p class="card-meta">{{ video.channel }} · {{ formatViews(video.views) }} views</p>
    </div>
  </div>
</template>

<script>
export default {
  props: ['video'],
  emits: ['select'],
  methods: {
    formatViews(n) {
      return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
    }
  }
}
</script>`,
        },
        {
          name: 'VideoFeed.vue',
          language: 'vue',
          code: `<template>
  <div>
    <div v-if="loading" class="feed-loading">Loading\u2026</div>
    <div v-else class="feed-grid">
      <VideoCard v-for="v in videos" :key="v.id" :video="v" @select="$emit('select', $event)" />
    </div>
    <div class="pagination">
      <button class="page-btn" @click="prevPage" :disabled="page <= 1">\u2190 Prev</button>
      <span class="page-label">Page {{ page }}</span>
      <button class="page-btn" @click="nextPage">Next \u2192</button>
    </div>
  </div>
</template>

<script>
export default {
  components: { VideoCard },
  emits: ['select'],
  data() {
    return { videos: [], page: 1, loading: false };
  },
  watch: {
    page: {
      immediate: true,
      handler() { this.loadVideos(); }
    }
  },
  methods: {
    async loadVideos() {
      this.loading = true;
      this.videos = await fetchVideos(this.page);
      this.loading = false;
    },
    nextPage() { this.page++; },
    prevPage() { if (this.page > 1) this.page--; }
  }
}
</script>`,
        },
        {
          name: 'App.vue',
          language: 'vue',
          code: `<template>
  <div>
    <h1>Video Feed</h1>
    <VideoFeed @select="openVideo" />
    <div
      v-if="selectedId !== null"
      class="modal-overlay"
      style="display:flex"
      @click.self="closeModal"
    >
      <div class="modal-box">
        <button class="modal-close" @click="closeModal">\u2715 Close</button>
        <template v-if="selectedVideo">
          <h2 class="modal-title">{{ selectedVideo.title }}</h2>
          <p class="modal-channel">{{ selectedVideo.channel }}</p>
          <iframe
            class="modal-iframe"
            :src="'https://www.youtube.com/embed/' + selectedVideo.youtubeId"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </template>
        <p v-else class="modal-loading"><em>Loading\u2026</em></p>
        <p class="modal-hint"><em>Press Escape to close</em></p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  components: { VideoFeed },
  data() {
    return { selectedId: null, selectedVideo: null };
  },
  created() {
    this._keyHandler = (e) => { if (e.key === 'Escape') this.selectedId = null; };
  },
  mounted() {
    window.addEventListener('keydown', this._keyHandler);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this._keyHandler);
  },
  methods: {
    async openVideo(id) {
      this.selectedId = id;
      this.selectedVideo = null;
      const res = await fetch('/api/videos/' + id);
      this.selectedVideo = await res.json();
    },
    closeModal() { this.selectedId = null; this.selectedVideo = null; }
  }
}
</script>

<style>
${sharedStyles}
</style>`,
        },
      ],
    },

    react: {
      files: [
        {
          name: 'api.js',
          language: 'javascript',
          code: `async function fetchVideos(page) {
  const res = await fetch('/api/videos?page=' + page);
  return res.json();
}`,
        },
        {
          name: 'style.css',
          language: 'css',
          code: sharedStyles,
        },
        {
          name: 'VideoCard.jsx',
          language: 'tsx',
          code: `function VideoCard({ video, onSelect }) {
  function formatViews(n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }
  return (
    <div className="card" onClick={() => onSelect(video.id)}>
      <img className="card-thumb" src={video.thumbnail} alt={video.title} />
      <div className="card-body">
        <h3 className="card-title">{video.title}</h3>
        <p className="card-meta">{video.channel} · {formatViews(video.views)} views</p>
      </div>
    </div>
  );
}`,
        },
        {
          name: 'VideoFeed.jsx',
          language: 'tsx',
          code: `function VideoFeed({ onSelect }) {
  const [videos, setVideos] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetchVideos(page).then(data => {
      setVideos(data);
      setLoading(false);
    });
  }, [page]);

  return (
    <div>
      {loading && <div className="feed-loading">Loading\u2026</div>}
      {!loading && (
        <div className="feed-grid">
          {videos.map(v => <VideoCard key={v.id} video={v} onSelect={onSelect} />)}
        </div>
      )}
      <div className="pagination">
        <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>\u2190 Prev</button>
        <span className="page-label">Page {page}</span>
        <button className="page-btn" onClick={() => setPage(p => p + 1)}>Next \u2192</button>
      </div>
    </div>
  );
}`,
        },
        {
          name: 'App.jsx',
          language: 'tsx',
          code: `function App() {
  const [selectedId, setSelectedId] = React.useState(null);
  const [selectedVideo, setSelectedVideo] = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function openVideo(id) {
    setSelectedId(id);
    setSelectedVideo(null);
    fetch('/api/videos/' + id).then(r => r.json()).then(setSelectedVideo);
  }

  return (
    <div>
      <h1>Video Feed</h1>
      <VideoFeed onSelect={openVideo} />
      {selectedId !== null && (
        <div
          className="modal-overlay"
          style={{display:'flex'}}
          onClick={e => e.target === e.currentTarget && setSelectedId(null)}
        >
          <div className="modal-box">
            <button className="modal-close" onClick={() => { setSelectedId(null); setSelectedVideo(null); }}>\u2715 Close</button>
            {selectedVideo ? (
              <>
                <h2 className="modal-title">{selectedVideo.title}</h2>
                <p className="modal-channel">{selectedVideo.channel}</p>
                <iframe
                  className="modal-iframe"
                  src={'https://www.youtube.com/embed/' + selectedVideo.youtubeId}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </>
            ) : (
              <p className="modal-loading"><em>Loading\u2026</em></p>
            )}
            <p className="modal-hint"><em>Press Escape to close</em></p>
          </div>
        </div>
      )}
    </div>
  );
}`,
        },
      ],
    },

    vanilla: {
      files: [
        {
          name: 'api.js',
          language: 'javascript',
          code: `async function fetchVideos(page) {
  const res = await fetch('/api/videos?page=' + page);
  return res.json();
}`,
        },
        {
          name: 'video-feed.js',
          language: 'javascript',
          code: `let page = 1;
let selectedId = null;
let loadGen = 0;
let escapeHandler = null;

async function loadFeed() {
  const gen = ++loadGen;
  const container = document.getElementById('feed');
  container.innerHTML = '<div class="feed-loading">Loading\u2026</div>';
  const videos = await fetchVideos(page);
  if (gen !== loadGen) return;
  renderVideos(videos);
}

function renderVideos(videos) {
  const container = document.getElementById('feed');
  container.innerHTML = videos.map(v => \`
    <div class="card" data-id="\${v.id}">
      <img class="card-thumb" src="\${v.thumbnail}" alt="\${v.title}" />
      <div class="card-body">
        <h3 class="card-title">\${v.title}</h3>
        <p class="card-meta">\${v.channel}</p>
      </div>
    </div>
  \`).join('');
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openVideo(Number(card.dataset.id)));
  });
  document.getElementById('page-label').textContent = 'Page ' + page;
}

function openVideo(id) {
  selectedId = id;
  if (escapeHandler) window.removeEventListener('keydown', escapeHandler);
  escapeHandler = (e) => { if (e.key === 'Escape') closeModal(); };
  window.addEventListener('keydown', escapeHandler);
  const modal = document.getElementById('modal');
  modal.style.display = 'flex';
  document.getElementById('modal-content').innerHTML = '<p class="modal-loading"><em>Loading\u2026</em></p>';
  fetch('/api/videos/' + id).then(r => r.json()).then(v => {
    document.getElementById('modal-content').innerHTML = \`
      <h2 class="modal-title">\${v.title}</h2>
      <p class="modal-channel">\${v.channel} \xb7 \${v.views} views \xb7 \${v.duration}</p>
      <iframe
        class="modal-iframe"
        src="https://www.youtube.com/embed/\${v.youtubeId}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
      <p class="modal-hint"><em>Press Escape to close</em></p>
    \`;
  });
}

function closeModal() {
  if (escapeHandler) { window.removeEventListener('keydown', escapeHandler); escapeHandler = null; }
  document.getElementById('modal').style.display = 'none';
  selectedId = null;
}

document.addEventListener('DOMContentLoaded', () => {
  loadFeed();
  document.getElementById('next-btn').addEventListener('click', () => {
    page++;
    loadFeed();
  });
  document.getElementById('prev-btn').addEventListener('click', () => {
    if (page > 1) { page--; loadFeed(); }
  });
  document.getElementById('close-btn').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
});`,
        },
        {
          name: 'index.html',
          language: 'html',
          code: `<style>
${sharedStyles}
</style>

<h1>Video Feed</h1>

<div class="pagination">
  <button id="prev-btn" class="page-btn">\u2190 Prev</button>
  <span id="page-label" class="page-label">Page 1</span>
  <button id="next-btn" class="page-btn">Next \u2192</button>
</div>

<div id="feed" class="feed-grid"></div>

<div id="modal" class="modal-overlay" style="display:none">
  <div class="modal-box">
    <button id="close-btn" class="modal-close">\u2715 Close</button>
    <div id="modal-content"></div>
  </div>
</div>`,
        },
      ],
    },
  },
}
