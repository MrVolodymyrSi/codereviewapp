export function buildVanillaSrcdoc(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; padding: 1.5rem; margin: 0; }
    button { padding: 6px 14px; cursor: pointer; font-size: 1rem; }
  </style>
  <script>
    window.onerror = function(msg, src, line) {
      document.body.innerHTML = '<pre style="color:red;padding:1rem;white-space:pre-wrap">' + msg + ' (line ' + line + ')' + '</pre>';
      return true;
    };
  <\/script>
</head>
<body>
${code}
</body>
</html>`
}
