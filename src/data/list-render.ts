import type { Challenge } from '../types/challenge'

export const listRender: Challenge = {
  id: 'list-render',
  title: 'Todo List',
  description:
    'A simple todo list where users can add and remove items. ' +
    'Reviewers have reported some items behave unexpectedly after deletion.',
  bugs: [
    {
      title: 'Re-rendering via innerHTML destroys event listeners (Vanilla)',
      explanation:
        'Each add/remove call rebuilds the entire list with innerHTML. ' +
        'This discards all previously attached click handlers on existing items, ' +
        'so after the first add, the remove buttons on old items stop working.',
    },
    {
      title: 'Missing :key on v-for (Vue)',
      explanation:
        'Without a unique `:key`, Vue reuses DOM nodes based on index when ' +
        'items are removed. If you delete an item in the middle, Vue patches ' +
        'the wrong nodes — text content updates but checked state, focus, and ' +
        'animations leak across items.',
    },
    {
      title: 'State mutated directly instead of new array (React)',
      explanation:
        '`items.push(newItem)` mutates the existing array in place. React uses ' +
        'shallow reference equality to detect state changes, so `setItems(items)` ' +
        'after a push passes the same array reference — React skips the re-render ' +
        'and the UI never updates.',
    },
  ],
  variants: {
    vanilla: {
      language: 'html',
      code: `<div>
  <input id="input" placeholder="New todo" />
  <button id="add-btn">Add</button>
  <ul id="list"></ul>
</div>

<script>
  const items = [];

  function render() {
    // rebuilds innerHTML every time — destroys old event listeners
    document.getElementById('list').innerHTML = items
      .map((item, i) => \`<li>\${item} <button class="rm" data-i="\${i}">x</button></li>\`)
      .join('');

    document.querySelectorAll('.rm').forEach(btn => {
      btn.addEventListener('click', () => {
        items.splice(Number(btn.dataset.i), 1);
        render();
      });
    });
  }

  document.getElementById('add-btn').addEventListener('click', () => {
    const val = document.getElementById('input').value.trim();
    if (val) { items.push(val); render(); }
  });
<\/script>`,
    },

    vue: {
      language: 'vue',
      code: `{
  template: \`
    <div>
      <input v-model="newItem" placeholder="New todo" @keyup.enter="add" />
      <button @click="add">Add</button>
      <ul>
        <li v-for="(item, i) in items"> <!-- missing :key -->
          {{ item }}
          <button @click="remove(i)">x</button>
        </li>
      </ul>
    </div>
  \`,
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
}`,
    },

    react: {
      language: 'tsx',
      code: `function App() {
  const [items, setItems] = React.useState(['Buy groceries', 'Walk the dog']);
  const [newItem, setNewItem] = React.useState('');

  function add() {
    if (!newItem.trim()) return;
    items.push(newItem.trim()); // mutates array directly
    setItems(items);            // same reference — React skips re-render
    setNewItem('');
  }

  function remove(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <input value={newItem} onChange={e => setNewItem(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && add()} placeholder="New todo" />
      <button onClick={add}>Add</button>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item} <button onClick={() => remove(i)}>x</button></li>
        ))}
      </ul>
    </div>
  );
}`,
    },
  },
}
