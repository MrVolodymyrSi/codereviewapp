import type { ChallengeFile } from '../types/challenge'
import { MOCK_FETCH_INJECTION } from './mock-api'
import { IFRAME_BRIDGE_INJECTION } from './iframe-bridge'

export function buildVanillaSrcdoc(files: ChallengeFile[]): string {
  const htmlFile = files.find((f) => f.name.endsWith('.html'))
  const jsFiles = files.filter((f) => f.name.endsWith('.js'))

  const bodyContent = htmlFile ? htmlFile.code : ''
  const jsCode = jsFiles.map((f) => f.code).join('\n')

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
  <script>${MOCK_FETCH_INJECTION}<\/script>
  <script>${IFRAME_BRIDGE_INJECTION}<\/script>
</head>
<body>
${bodyContent}
${jsCode ? `<script>\n${jsCode}\n<\/script>` : ''}
</body>
</html>`
}
