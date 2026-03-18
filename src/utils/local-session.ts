// Shared session ID utility — uses the URL ?sid= if present, else a locally persisted UUID.
// Both useBugChecklist and useNotes import this so they always use the same key.
const urlSid = new URLSearchParams(window.location.search).get('sid')
const LOCAL_SID_KEY = 'codereview:local-sid'

let _sid: string | null = null

export function getLocalSid(): string {
  if (_sid) return _sid
  _sid = urlSid || localStorage.getItem(LOCAL_SID_KEY)
  if (!_sid) {
    _sid = crypto.randomUUID()
    localStorage.setItem(LOCAL_SID_KEY, _sid)
  }
  return _sid
}
