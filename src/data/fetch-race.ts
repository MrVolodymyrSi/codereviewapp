import type { Challenge } from '../types/challenge'

const sharedStyles = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=Outfit:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: 'Outfit', sans-serif;
  background: #0d0d12;
  color: #e0e0ec;
  padding: 2.5rem 1.5rem;
  margin: 0;
}

.profile-fetcher {
  max-width: 380px;
  margin: 0 auto;
}

h1 {
  font-family: 'Fraunces', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #f0f0f8;
  margin: 0 0 2rem;
  letter-spacing: -0.03em;
}

.field-group {
  margin-bottom: 2rem;
}

.field-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4fd1c7;
  margin-bottom: 8px;
}

.user-select {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.15);
  color: #e0e0ec;
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  font-weight: 300;
  padding: 8px 2rem 10px 0;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath d='M3 5L7 9L11 5' stroke='%234fd1c7' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  transition: border-color 0.2s;
}

.user-select:focus {
  border-bottom-color: #4fd1c7;
}

.user-select option {
  background: #1a1a24;
}

/* Profile card */
.profile-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  background: #14141e;
  border: 1px solid rgba(79, 209, 199, 0.15);
  border-radius: 12px;
  animation: cardIn 0.25s ease;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4fd1c7 0%, #2fa898 100%);
  color: #0d0d12;
  font-family: 'Fraunces', serif;
  font-size: 1.4rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-name {
  font-family: 'Fraunces', serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: #f0f0f8;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}

.profile-role {
  display: inline-flex;
  align-items: center;
  background: rgba(79, 209, 199, 0.08);
  border: 1px solid rgba(79, 209, 199, 0.2);
  color: #4fd1c7;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
}

/* States */
.state-text {
  color: rgba(224, 224, 236, 0.28);
  font-size: 0.9rem;
  font-weight: 300;
  padding: 1rem 0;
}

.loading-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 1rem 0;
}

.loading-label {
  color: rgba(224, 224, 236, 0.35);
  font-size: 0.85rem;
  font-weight: 300;
}

.dots {
  display: flex;
  gap: 4px;
}

.dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4fd1c7;
  animation: pulse 1s ease-in-out infinite;
}

.dots span:nth-child(2) { animation-delay: 0.15s; }
.dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes pulse {
  0%, 80%, 100% { transform: scale(0.55); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
`

export const fetchRace: Challenge = {
  id: 'fetch-race',
  title: 'User Profile Fetcher',
  description:
    'A component that fetches and displays a user profile when a user ID is selected.',
  bugs: [
    {
      id: 'fr-1',
      file: 'App.vue',
      line: 43,
      description: 'Race condition: fetchUser sets this.profile without checking if userId changed since the request was sent — switching users quickly can show stale data',
      severity: 'high',
      variant: 'vue',
    },
    {
      id: 'fr-2',
      file: 'App.jsx',
      line: 12,
      description: 'useEffect has no cleanup — the setTimeout callback calls setProfile/setLoading even after userId changes, causing state updates from stale fetches',
      severity: 'high',
      variant: 'react',
    },
    {
      id: 'fr-3',
      file: 'App.vue',
      line: 37,
      description: 'users map is reconstructed inside fetchUser on every call — should be a module-level constant or fetched from an API',
      severity: 'low',
      variant: 'vue',
    },
  ],
  variants: {
    vanilla: {
      files: [
        {
          name: 'index.html',
          language: 'html',
          code: `<style>${sharedStyles}</style>

<div class="profile-fetcher">
  <h1>Team Directory</h1>
  <div class="field-group">
    <label class="field-label" for="user-select">Select user</label>
    <select id="user-select" class="user-select">
      <option value="1">User 1</option>
      <option value="2">User 2</option>
      <option value="3">User 3</option>
    </select>
  </div>
  <div id="profile"><div class="state-text">Select a user to view their profile</div></div>
</div>

<script>
  const USERS = {
    1: { name: 'Alice', role: 'Engineer' },
    2: { name: 'Bob', role: 'Designer' },
    3: { name: 'Carol', role: 'Manager' },
  };

  function fakeFetch(id) {
    // simulate network delay (longer for id=2 to trigger the race)
    const delay = id == 2 ? 800 : 200;
    return new Promise(resolve =>
      setTimeout(() => resolve(USERS[id]), delay)
    );
  }

  function renderLoading() {
    document.getElementById('profile').innerHTML =
      '<div class="loading-wrap"><div class="dots"><span></span><span></span><span></span></div><span class="loading-label">Fetching profile\u2026</span></div>';
  }

  function renderProfile(user) {
    document.getElementById('profile').innerHTML =
      \`<div class="profile-card">
        <div class="avatar">\${user.name[0]}</div>
        <div>
          <div class="profile-name">\${user.name}</div>
          <div class="profile-role">\${user.role}</div>
        </div>
      </div>\`;
  }

  let latestId = null;
  document.getElementById('user-select').addEventListener('change', async (e) => {
    const id = e.target.value;
    latestId = id;
    renderLoading();
    const user = await fakeFetch(id);
    if (latestId === id) {
      renderProfile(user);
    }
  });
<\/script>`,
        },
      ],
    },

    vue: {
      files: [
        {
          name: 'App.vue',
          language: 'vue',
          code: `<template>
  <div class="profile-fetcher">
    <h1>Team Directory</h1>
    <div class="field-group">
      <label class="field-label">Select user</label>
      <select v-model="userId" class="user-select">
        <option value="1">User 1</option>
        <option value="2">User 2</option>
        <option value="3">User 3</option>
      </select>
    </div>
    <div v-if="loading" class="loading-wrap">
      <div class="dots"><span></span><span></span><span></span></div>
      <span class="loading-label">Fetching profile…</span>
    </div>
    <div v-else-if="profile" class="profile-card">
      <div class="avatar">{{ profile.name[0] }}</div>
      <div>
        <div class="profile-name">{{ profile.name }}</div>
        <div class="profile-role">{{ profile.role }}</div>
      </div>
    </div>
    <div v-else class="state-text">Select a user to view their profile</div>
  </div>
</template>

<script>
export default {
  data() {
    return { userId: '1', profile: null, loading: false };
  },
  watch: {
    userId: {
      immediate: true,
      handler(newId) { this.fetchUser(newId); }
    }
  },
  methods: {
    async fetchUser(id) {
      this.loading = true;
      const users = {
        1: { name: 'Alice', role: 'Engineer' },
        2: { name: 'Bob', role: 'Designer' },
        3: { name: 'Carol', role: 'Manager' },
      };
      await new Promise(r => setTimeout(r, 300));
      this.profile = users[id];
      this.loading = false;
    }
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
          name: 'style.css',
          language: 'css',
          code: sharedStyles,
        },
        {
          name: 'App.jsx',
          language: 'tsx',
          code: `function App() {
  const [userId, setUserId] = React.useState('1');
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const users = {
    1: { name: 'Alice', role: 'Engineer' },
    2: { name: 'Bob', role: 'Designer' },
    3: { name: 'Carol', role: 'Manager' },
  };

  React.useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setProfile(users[userId]);
      setLoading(false);
    }, 300);
  }, [userId]);

  return (
    <div className="profile-fetcher">
      <h1>Team Directory</h1>
      <div className="field-group">
        <label className="field-label">Select user</label>
        <select className="user-select" value={userId} onChange={e => setUserId(e.target.value)}>
          <option value="1">User 1</option>
          <option value="2">User 2</option>
          <option value="3">User 3</option>
        </select>
      </div>
      {loading && (
        <div className="loading-wrap">
          <div className="dots"><span /><span /><span /></div>
          <span className="loading-label">Fetching profile…</span>
        </div>
      )}
      {!loading && profile && (
        <div className="profile-card">
          <div className="avatar">{profile.name[0]}</div>
          <div>
            <div className="profile-name">{profile.name}</div>
            <div className="profile-role">{profile.role}</div>
          </div>
        </div>
      )}
      {!loading && !profile && (
        <div className="state-text">Select a user to view their profile</div>
      )}
    </div>
  );
}`,
        },
      ],
    },
  },
}
