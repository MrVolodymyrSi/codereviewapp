import type { ChallengeFile } from '../types/challenge'
import { MOCK_FETCH_INJECTION } from './mock-api'
import { IFRAME_BRIDGE_INJECTION } from './iframe-bridge'

export function buildReactSrcdoc(files: ChallengeFile[]): string {
  const cssFiles = files.filter((f) => f.name.endsWith('.css'))
  const codeFiles = files.filter((f) => !f.name.endsWith('.css'))
  const allCode = codeFiles.map((f) => f.code).join('\n')
  const cssCode = cssFiles.map((f) => f.code).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; padding: 1.5rem; margin: 0; }
    button { padding: 6px 14px; cursor: pointer; font-size: 1rem; }
    #root { min-height: 20px; }
  </style>
  ${cssCode ? `<style>\n${cssCode}\n</style>` : ''}
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script>${MOCK_FETCH_INJECTION}<\/script>
  <script>${IFRAME_BRIDGE_INJECTION}<\/script>
</head>
<body>
  <div id="root"><span style="color:#999;font-size:0.85rem">Compiling...</span></div>
  <script type="text/babel">
    ${allCode}
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  <\/script>
</body>
</html>`
}
