export function buildVueSrcdoc(componentCode: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; padding: 1.5rem; margin: 0; }
    button { padding: 6px 14px; cursor: pointer; font-size: 1rem; }
  </style>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>
</head>
<body>
  <div id="app"></div>
  <script>
    var _app = document.getElementById('app');
    window.onerror = function(msg, src, line) {
      _app.innerHTML = '<pre style="color:red;padding:1rem;white-space:pre-wrap">' + msg + ' (line ' + line + ')' + '</pre>';
      return true;
    };
    try {
      var App = (${componentCode});
      Vue.createApp(App).mount('#app');
    } catch(e) {
      _app.innerHTML = '<pre style="color:red;padding:1rem;white-space:pre-wrap">' + e.message + '</pre>';
    }
  <\/script>
</body>
</html>`
}
