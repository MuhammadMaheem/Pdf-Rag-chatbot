import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { api } from './services/api'
import type { DocumentItem, SourceChunk } from './types'

type UiMsg = { id: string; role: 'user' | 'assistant'; text: string; sources?: SourceChunk[] }
type Page = 'chat' | 'docs'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const s = localStorage.getItem('ui-theme')
  if (s === 'light' || s === 'dark') return s
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function uid() {
  return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/* ===================== ICONS ===================== */

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)
const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IconFolder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)
const IconSun = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const IconUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)
const IconUploadLg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)
const IconSparkle = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
  </svg>
)
const IconDoc = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
)

/* ===================== APP ===================== */

export default function App() {
  const fileRef = useRef<HTMLInputElement>(null)
  const msgRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState<Page>('chat')
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [msgs, setMsgs] = useState<UiMsg[]>([])
  const [q, setQ] = useState('')
  const [srcs, setSrcs] = useState<SourceChunk[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [theme, setTheme] = useState(getInitialTheme)
  const [health, setHealth] = useState<'ok' | 'offline' | 'checking'>('checking')
  const [loadDocs, setLoadDocs] = useState(true)

  const canAsk = docs.length > 0 && q.trim().length > 0

  useEffect(() => { if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight }, [msgs])
  useEffect(() => { void pullDocs(); void pullHealth() }, [])
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('ui-theme', theme) }, [theme])

  async function pullHealth() {
    try { setHealth((await api.health()).status === 'ok' ? 'ok' : 'offline') }
    catch { setHealth('offline') }
  }

  async function pullDocs() {
    setLoadDocs(true)
    try { setDocs(await api.listDocuments()); setErr('') }
    catch { setErr('Cannot reach backend.') }
    finally { setLoadDocs(false) }
  }

  async function onUpload(f?: File) {
    if (!f) return
    setBusy(true); setErr('')
    try { await api.uploadPdf(f); await pullDocs() }
    catch (e: unknown) { setErr((e as Error)?.message || 'Upload failed.') }
    finally { setBusy(false) }
  }

  async function onDelete(id: string) {
    if (!confirm('Remove this document?')) return
    setBusy(true); setErr('')
    try { await api.deleteDocument(id); await pullDocs() }
    catch { setErr('Delete failed.') }
    finally { setBusy(false) }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.closest('form')?.requestSubmit() }
  }

  async function onAsk(e: FormEvent) {
    e.preventDefault()
    const text = q.trim()
    if (!text) return
    setMsgs(p => [...p, { id: uid(), role: 'user', text }])
    setQ(''); setBusy(true); setErr('')
    try {
      const r = await api.ask(text)
      setMsgs(p => [...p, { id: uid(), role: 'assistant', text: r.answer, sources: r.sources }])
      setSrcs(r.sources)
    } catch (e: unknown) { setErr((e as Error)?.message || 'Could not answer.') }
    finally { setBusy(false) }
  }

  return (
    <div className="app">
      {/* ---- SIDEBAR ---- */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <IconFile />
          <span>PDF Studio</span>
        </div>

        <button className={`nav-btn ${page === 'chat' ? 'active' : ''}`} onClick={() => setPage('chat')} aria-current={page === 'chat' ? 'page' : undefined}>
          <IconChat /> <span>Chat</span>
        </button>
        <button className={`nav-btn ${page === 'docs' ? 'active' : ''}`} onClick={() => setPage('docs')} aria-current={page === 'docs' ? 'page' : undefined}>
          <IconFolder /> <span>Documents</span>
        </button>

        <div className="sidebar-bottom">
          <button
            className="theme-btn"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </aside>

      {/* ---- MAIN ---- */}
      <div className="main">
        <header className="topbar">
          <h1>{page === 'chat' ? 'Chat' : 'Documents'}</h1>
          <div className="topbar-right">
            <span className={`status status-${health}`}>
              <span className="status-dot" />
              {health === 'ok' ? 'Online' : health === 'offline' ? 'Offline' : 'Checking'}
            </span>
            <button className="icon-btn" onClick={() => void pullDocs()} disabled={busy} aria-label="Refresh">
              <IconRefresh />
            </button>
          </div>
        </header>

        <div className="content">
          {err && <div className="error-box" role="alert">{err}</div>}

          {/* ---- CHAT PAGE ---- */}
          {page === 'chat' && (
            <div className="chat-layout">
              {/* Chat panel */}
              <div className="panel chat-panel">
                <div className="panel-head">
                  <div>
                    <h2>Ask a Question</h2>
                    <p>Answers grounded in your documents</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="msgs" ref={msgRef} aria-live="polite">
                    {msgs.length === 0
                      ? <div className="empty-chat">
                          <span className="empty-icon"><IconSparkle /></span>
                          <h3>Start a conversation</h3>
                          <p>Ask about your uploaded documents</p>
                        </div>
                      : msgs.map(m => (
                        <div key={m.id} className={`msg msg-${m.role === 'user' ? 'user' : 'ai'}`}>
                          <div className="msg-label">{m.role === 'user' ? 'You' : 'Assistant'}</div>
                          {m.role === 'user'
                            ? m.text
                            : <><p>{m.text}</p>
                                {m.sources?.length ? (
                                  <button className="src-btn" onClick={() => setSrcs(m.sources ?? [])}>
                                    {m.sources.length} source{m.sources.length > 1 ? 's' : ''}
                                  </button>
                                ) : null}
                              </>
                          }
                        </div>
                      ))}
                  </div>
                  <form className="composer" onSubmit={onAsk}>
                    <label htmlFor="q" style={{ display: 'none' }}>Ask a question</label>
                    <textarea id="q" value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
                      placeholder="Ask about your documents…" rows={1} disabled={busy || !docs.length} />
                    <button type="submit" className="send-btn" disabled={!canAsk || busy} aria-label="Send">
                      <IconSend />
                    </button>
                  </form>
                </div>
              </div>

              {/* Evidence panel */}
              <div className="panel evidence-panel">
                <div className="panel-head">
                  <div>
                    <h2>Evidence</h2>
                    <p>Sources used for responses</p>
                  </div>
                </div>
                <div className="panel-body">
                  {srcs.length === 0
                    ? <div className="empty-sources">
                        <IconDoc />
                        <p>Sources will appear here<br />after you ask a question</p>
                      </div>
                    : srcs.map(s => (
                      <div className="src-card" key={s.chunk_id}>
                        <div className="src-top">
                          <span className="src-name">{s.source} — p. {s.page}</span>
                          <span className="src-score">{s.score.toFixed(3)}</span>
                        </div>
                        <p className="src-text">{s.content}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- DOCUMENTS PAGE ---- */}
          {page === 'docs' && (
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>Uploaded Documents</h2>
                  <p>Manage your PDF knowledge base</p>
                </div>
                <button className="upload-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
                  <IconUpload /> Upload
                </button>
                <input ref={fileRef} type="file" accept="application/pdf" aria-label="Upload PDF"
                  onChange={e => void onUpload(e.target.files?.[0])} disabled={busy} style={{ display: 'none' }} />
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                {loadDocs
                  ? <div className="loading-state">Loading…</div>
                  : docs.length === 0
                    ? <div className="empty-state">
                        <span className="empty-icon"><IconUploadLg /></span>
                        <p>No documents yet</p>
                        <span className="upload-hint">Click <strong>Upload</strong> to add a PDF</span>
                      </div>
                    : <table className="doc-table">
                        <thead>
                          <tr><th>Name</th><th>Chunks</th><th style={{ width: 36 }} /></tr>
                        </thead>
                        <tbody>
                          {docs.map(d => (
                            <tr key={d.document_id}>
                              <td className="doc-name">{d.filename}</td>
                              <td className="doc-chunks">{d.chunks_created}</td>
                              <td>
                                <button className="del-btn" onClick={() => void onDelete(d.document_id)} disabled={busy}
                                  aria-label={`Remove ${d.filename}`}>
                                  <IconX />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
