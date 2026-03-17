import type { Challenge } from '../types/challenge'

export const fetchRace: Challenge = {
  id: 'fetch-race',
  title: 'User Profile Fetcher',
  description:
    'A component that fetches and displays a user profile when a user ID is selected. ' +
    'Testers say the wrong profile sometimes appears after switching users quickly.',
  bugs: [
    {
      title: 'Race condition — no request cancellation (Vanilla)',
      explanation:
        'When the user changes the ID quickly, multiple fetch calls are in flight. ' +
        'They resolve out of order, so the last resolved response (not the last ' +
        'initiated request) wins. The displayed profile may not match the selected ID.',
    },
    {
      title: 'watch missing immediate:true — first render is empty (Vue)',
      explanation:
        'The `watch` on `userId` only fires on changes, not on mount. ' +
        'The initial value is never fetched, so the profile area is blank ' +
        'until the user manually switches to a different ID and back.',
    },
    {
      title: 'useEffect dependency array is empty — never re-fetches (React)',
      explanation:
        '`useEffect(..., [])` runs only once after mount, regardless of how ' +
        '`userId` changes. Selecting a different user updates the dropdown ' +
        'visually but the displayed profile stays stale.',
    },
  ],
  variants: {
    vanilla: {
      language: 'html',
      code: `<div>
  <select id="user-select">
    <option value="1">User 1</option>
    <option value="2">User 2</option>
    <option value="3">User 3</option>
  </select>
  <div id="profile">Select a user...</div>
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

  document.getElementById('user-select').addEventListener('change', async (e) => {
    const id = e.target.value;
    document.getElementById('profile').textContent = 'Loading...';
    // no AbortController — old requests can overwrite newer ones
    const user = await fakeFetch(id);
    document.getElementById('profile').textContent =
      user.name + ' — ' + user.role;
  });
<\/script>`,
    },

    vue: {
      language: 'vue',
      code: `{
  template: \`
    <div>
      <select v-model="userId">
        <option value="1">User 1</option>
        <option value="2">User 2</option>
        <option value="3">User 3</option>
      </select>
      <div v-if="loading">Loading...</div>
      <div v-else-if="profile">{{ profile.name }} — {{ profile.role }}</div>
      <div v-else>Select a user...</div>
    </div>
  \`,
  data() {
    return { userId: '1', profile: null, loading: false };
  },
  watch: {
    // missing immediate: true — won't run on initial mount
    userId(newId) {
      this.fetchUser(newId);
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
}`,
    },

    react: {
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
    // empty dependency array — only runs once, ignores userId changes
    setTimeout(() => {
      setProfile(users[userId]);
      setLoading(false);
    }, 300);
  }, []); // <-- should be [userId]

  return (
    <div>
      <select value={userId} onChange={e => setUserId(e.target.value)}>
        <option value="1">User 1</option>
        <option value="2">User 2</option>
        <option value="3">User 3</option>
      </select>
      {loading && <div>Loading...</div>}
      {!loading && profile && <div>{profile.name} — {profile.role}</div>}
    </div>
  );
}`,
    },
  },
}
