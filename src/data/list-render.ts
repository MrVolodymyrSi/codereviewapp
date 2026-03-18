import type { Challenge } from '../types/challenge'

const sharedStyles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');

*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: 'DM Sans', sans-serif;
  background: #f9f7f3;
  color: #1c1917;
  padding: 2rem 1.5rem;
  margin: 0;
}

.todo-app {
  max-width: 400px;
  margin: 0 auto;
}

h1 {
  font-family: 'DM Serif Display', serif;
  font-size: 1.75rem;
  font-weight: 400;
  color: #1c1917;
  margin: 0 0 1.5rem;
  letter-spacing: -0.02em;
}

.add-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 2px solid #1c1917;
  padding-bottom: 12px;
  margin-bottom: 1.25rem;
}

input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.95rem;
  color: #1c1917;
  outline: none;
  padding: 2px 0;
  min-width: 0;
}

input::placeholder { color: #a8a29e; }

.add-btn {
  width: 32px;
  height: 32px;
  background: #c4714a;
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  transition: background 0.15s, transform 0.1s;
}

.add-btn:hover {
  background: #b0623e;
  transform: scale(1.08);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0;
  border-bottom: 1px solid #e7e2db;
  font-size: 0.93rem;
  animation: appear 0.18s ease;
}

@keyframes appear {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

.item-text {
  flex: 1;
  min-width: 0;
}

.rm {
  background: none;
  border: none;
  color: #c4b5a8;
  cursor: pointer;
  font-size: 1.1rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.rm:hover {
  color: #c4714a;
  background: #fdf0eb;
}
`

export const listRender: Challenge = {
  id: 'list-render',
  title: 'Todo List',
  description:
    'A simple todo list where users can add and remove items.',
  bugs: [
    {
      id: 'lr-1',
      file: 'App.vue',
      line: 9,
      description: ':key uses the array index — Vue may reuse incorrect DOM nodes when items are removed mid-list, causing animation glitches and stale component state',
      severity: 'medium',
      variant: 'vue',
    },
    {
      id: 'lr-2',
      file: 'App.jsx',
      line: 24,
      description: 'key prop uses array index — React can mismatch elements when items are deleted, risking wrong focus state or incorrect list rendering',
      severity: 'medium',
      variant: 'react',
    },
  ],
  variants: {
    vanilla: {
      files: [
        {
          name: 'index.html',
          language: 'html',
          code: `<style>${sharedStyles}</style>

<div class="todo-app">
  <h1>Today's Tasks</h1>
  <div class="add-row">
    <input id="input" placeholder="Add a task…" />
    <button id="add-btn" class="add-btn">+</button>
  </div>
  <ul id="list"></ul>
</div>

<script>
  const items = ['Buy groceries', 'Walk the dog'];

  function render() {
    document.getElementById('list').innerHTML = items
      .map((item, i) => \`<li><span class="item-text">\${item}</span><button class="rm" data-i="\${i}">×</button></li>\`)
      .join('');
  }

  document.getElementById('list').addEventListener('click', (e) => {
    const btn = e.target.closest('.rm');
    if (!btn) return;
    items.splice(Number(btn.dataset.i), 1);
    render();
  });

  document.getElementById('add-btn').addEventListener('click', () => {
    const val = document.getElementById('input').value.trim();
    if (val) { items.push(val); render(); }
  });

  document.getElementById('input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-btn').click();
  });

  render();
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
  <div class="todo-app">
    <h1>Today's Tasks</h1>
    <div class="add-row">
      <input v-model="newItem" placeholder="Add a task…" @keyup.enter="add" />
      <button class="add-btn" @click="add">+</button>
    </div>
    <ul>
      <li v-for="(item, i) in items" :key="i">
        <span class="item-text">{{ item }}</span>
        <button class="rm" @click="remove(i)">×</button>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return { items: ['Buy groceries', 'Walk the dog'], newItem: '' };
  },
  methods: {
    add() {
      if (this.newItem.trim()) {
        this.items.push(this.newItem.trim());
        this.newItem = '';
      }
    },
    remove(i) { this.items.splice(i, 1); }
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
  const [items, setItems] = React.useState(['Buy groceries', 'Walk the dog']);
  const [newItem, setNewItem] = React.useState('');

  function add() {
    if (!newItem.trim()) return;
    setItems([...items, newItem.trim()]);
    setNewItem('');
  }

  function remove(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="todo-app">
      <h1>Today's Tasks</h1>
      <div className="add-row">
        <input value={newItem} onChange={e => setNewItem(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && add()} placeholder="Add a task…" />
        <button className="add-btn" onClick={add}>+</button>
      </div>
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <span className="item-text">{item}</span>
            <button className="rm" onClick={() => remove(i)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}`,
        },
      ],
    },
  },
}
