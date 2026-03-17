import type { Challenge } from '../types/challenge'

export const counterBug: Challenge = {
  id: 'counter-bug',
  title: 'Counter Component',
  description:
    'A simple counter with increment and decrement buttons. ' +
    'The user reports the counter is not working correctly.',
  bugs: [
    {
      title: 'DOM not updated after state change (Vanilla)',
      explanation:
        'The innerHTML is written once at initialization. The click handlers ' +
        'mutate the `count` variable but never re-render the DOM, so the ' +
        'displayed number never changes.',
    },
    {
      title: 'data() does not return anything (Vue)',
      explanation:
        '`data()` declares a local `count` constant but never returns it. ' +
        'The returned object is implicitly `undefined`, so `this.count` is ' +
        'never reactive and the template always renders as blank.',
    },
    {
      title: 'useState initialized with a string (React)',
      explanation:
        '`useState("0")` sets the initial value to the string "0" instead of ' +
        'the number 0. The decrement button works because `"0" - 1 = -1` ' +
        '(coercion to number), but increment produces "01", "011" etc. because ' +
        '`"0" + 1 = "01"` (string concatenation).',
    },
  ],
  variants: {
    vanilla: {
      language: 'html',
      code: `<div id="app"></div>

<script>
  let count = 0;

  document.getElementById('app').innerHTML = \`
    <button id="dec">-</button>
    <span id="display">\${count}</span>
    <button id="inc">+</button>
  \`;

  document.getElementById('inc').addEventListener('click', () => {
    count++;
    // forgot to update the DOM
  });

  document.getElementById('dec').addEventListener('click', () => {
    count--;
    // forgot to update the DOM
  });
<\/script>`,
    },

    vue: {
      language: 'vue',
      code: `{
  template: \`
    <div>
      <button @click="decrement">-</button>
      <span>{{ count }}</span>
      <button @click="increment">+</button>
    </div>
  \`,
  data() {
    const count = 0; // declared but not returned
  },
  methods: {
    increment() { this.count++; },
    decrement() { this.count--; },
  }
}`,
    },

    react: {
      language: 'tsx',
      code: `function App() {
  const [count, setCount] = React.useState("0"); // string instead of number

  return (
    <div>
      <button onClick={() => setCount(count - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}`,
    },
  },
}
