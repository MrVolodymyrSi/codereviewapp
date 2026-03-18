<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useConsole } from '../composables/useConsole'
import type { ConsoleEntry, NetworkEntry } from '../types/console'

const { entries, clear } = useConsole()
const activeTab = ref<'console' | 'network'>('console')
const listRef = ref<HTMLDivElement | null>(null)

const consoleEntries = computed(() =>
  entries.value.filter((e) => e.kind === 'console') as ConsoleEntry[]
)
const networkEntries = computed(() =>
  entries.value.filter((e) => e.kind === 'network') as NetworkEntry[]
)

watch(entries, async () => {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
}, { deep: false })

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function statusColor(status: number | null, pending: boolean): string {
  if (pending || status === null) return 'var(--text-faint)'
  if (status >= 200 && status < 300) return 'var(--success)'
  if (status >= 400) return 'var(--danger)'
  return 'var(--text-muted)'
}

const LEVEL_COLORS: Record<string, string> = {
  log: 'var(--text)',
  info: 'var(--react)',
  warn: 'var(--vanilla)',
  error: 'var(--danger)',
}
</script>

<template>
  <div class="console-panel">
    <div class="console-header">
      <div class="tab-group">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'console' }"
          @click="activeTab = 'console'"
        >
          Console
          <span v-if="consoleEntries.length > 0" class="tab-count">{{ consoleEntries.length }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'network' }"
          @click="activeTab = 'network'"
        >
          Network
          <span v-if="networkEntries.length > 0" class="tab-count">{{ networkEntries.length }}</span>
        </button>
      </div>
      <button class="clear-btn" @click="clear">Clear</button>
    </div>

    <div ref="listRef" class="entry-list">
      <!-- Console tab -->
      <template v-if="activeTab === 'console'">
        <div v-if="consoleEntries.length === 0" class="empty-state">No output yet</div>
        <div
          v-for="entry in consoleEntries"
          :key="entry.id"
          class="console-row"
          :style="{ borderLeftColor: LEVEL_COLORS[entry.level] }"
        >
          <span class="entry-level" :style="{ color: LEVEL_COLORS[entry.level] }">{{ entry.level }}</span>
          <span class="entry-args">{{ entry.args.join(' ') }}</span>
          <span class="entry-time">{{ formatTime(entry.timestamp) }}</span>
        </div>
      </template>

      <!-- Network tab -->
      <template v-else>
        <div v-if="networkEntries.length === 0" class="empty-state">No requests yet</div>
        <div
          v-for="entry in networkEntries"
          :key="entry.id"
          class="network-row"
        >
          <span class="method-badge">{{ entry.method }}</span>
          <span class="network-url" :title="entry.url">{{ entry.url }}</span>
          <span
            class="status-badge"
            :style="{ color: statusColor(entry.status, entry.pending) }"
            :class="{ pending: entry.pending }"
          >{{ entry.pending ? '…' : entry.status }}</span>
          <span class="duration">{{ entry.duration !== null ? entry.duration + 'ms' : '' }}</span>
          <span class="entry-time">{{ formatTime(entry.timestamp) }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.console-panel {
  height: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  background: var(--bg);
  overflow: hidden;
}

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 32px;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tab-group {
  display: flex;
  gap: 0;
}

.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-faint);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.72rem;
  padding: 0 10px;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: color 0.15s, border-color 0.15s;
}

.tab-btn.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}

.tab-btn:hover:not(.active) {
  color: var(--text-muted);
}

.tab-count {
  background: var(--bg-elevated);
  border-radius: 8px;
  font-size: 0.62rem;
  padding: 1px 5px;
  color: var(--text-faint);
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.7rem;
  padding: 3px 6px;
  border-radius: 3px;
  transition: color 0.15s;
}

.clear-btn:hover {
  color: var(--text-muted);
}

.entry-list {
  flex: 1;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 0.73rem;
}

.empty-state {
  padding: 16px 14px;
  color: var(--text-faint);
  font-size: 0.75rem;
  font-family: var(--font-ui);
  font-style: italic;
}

/* Console rows */
.console-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px 12px;
  border-bottom: 1px solid var(--border-subtle);
  border-left: 2px solid transparent;
}

.console-row:hover {
  background: var(--bg-elevated);
}

.entry-level {
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
  width: 32px;
}

.entry-args {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
}

.entry-time {
  color: var(--text-faint);
  font-size: 0.65rem;
  flex-shrink: 0;
}

/* Network rows */
.network-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.network-row:hover {
  background: var(--bg-elevated);
}

.method-badge {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-dim);
  border-radius: 3px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.network-url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 600;
  flex-shrink: 0;
  min-width: 28px;
  text-align: right;
}

.status-badge.pending {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.duration {
  color: var(--text-faint);
  font-size: 0.68rem;
  flex-shrink: 0;
  min-width: 40px;
  text-align: right;
}
</style>
