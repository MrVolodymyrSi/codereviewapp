import type { ChallengeFile } from '../types/challenge'
import { IFRAME_BRIDGE_INJECTION } from './iframe-bridge'

function parseSfc(code: string): { template: string; script: string; styles: string } {
  const templateMatch = code.match(/<template>([\s\S]*)<\/template>/)
  const scriptMatch = code.match(/<script>([\s\S]*?)<\/script>/)
  const styleMatch = code.match(/<style>([\s\S]*?)<\/style>/)
  return {
    template: templateMatch ? templateMatch[1].trim() : '',
    script: scriptMatch ? scriptMatch[1].trim() : '',
    styles: styleMatch ? styleMatch[1].trim() : '',
  }
}

function escapeBackticks(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

export function buildVueSrcdoc(files: ChallengeFile[]): string {
  const jsFiles = files.filter((f) => f.name.endsWith('.js'))
  const vueFiles = files.filter((f) => f.name.endsWith('.vue'))

  let userScript = ''
  let extraStyles = ''

  for (const f of jsFiles) {
    userScript += f.code + '\n'
  }

  for (let i = 0; i < vueFiles.length; i++) {
    const f = vueFiles[i]
    const isLast = i === vueFiles.length - 1
    const stem = f.name.replace(/\.vue$/, '')
    const { template, script, styles } = parseSfc(f.code)
    if (styles) extraStyles += styles + '\n'
    const opts = script.replace(/^\s*export\s+default\s*/, '').replace(/;\s*$/, '')
    userScript += `var ${stem} = Object.assign(${opts}, { template: \`${escapeBackticks(template)}\` });\n`
    if (isLast) {
      userScript += `Vue.createApp(App).mount('#app');\n`
    }
  }

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
  <script>${IFRAME_BRIDGE_INJECTION}<\/script>
  ${extraStyles ? `<style>\n${extraStyles}</style>` : ''}
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
      ${userScript}
    } catch(e) {
      _app.innerHTML = '<pre style="color:red;padding:1rem;white-space:pre-wrap">' + e.message + '</pre>';
    }
  <\/script>
</body>
</html>`
}
