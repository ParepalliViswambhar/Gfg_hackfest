import { useState, useRef } from 'react'
import {
  Database, Upload, ChevronLeft, ChevronRight,
  Sparkles, Trash2, FileCode2, RefreshCw, X,
  BotMessageSquare, History, LogOut, ChevronDown, User,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Sidebar() {
  const {
    user, handleLogout,
    dbReady, datasetInfo, loading,
    availableModels, selectedModel, selectModel,
    suggestions, suggestionsLoading,
    chatSessions, currentSessionId,
    loadDefaultDataset, uploadDataset, fetchSchema, clearChat,
    sidebarOpen, setSidebarOpen,
    schemaText, sendQuery,
    refreshSessions, loadSession, deleteSession,
    resetToHome,
  } = useApp()

  const [dataMode, setDataMode] = useState('default')
  const [schemaVisible, setSchemaVisible] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const fileRef = useRef(null)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (file) await uploadDataset(file)
    e.target.value = ''
  }

  const handleSchema = async () => {
    if (!schemaVisible) await fetchSchema()
    setSchemaVisible(v => !v)
  }

  /* ── Collapsed sidebar ─────────────────────────────────────────────── */
  if (!sidebarOpen) {
    return (
      <div
        className="w-14 flex flex-col items-center pt-4 gap-5 flex-shrink-0"
        style={{ background: 'rgba(8,11,18,0.95)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-[#475569] hover:text-nykaa-pink transition-all duration-200 p-2 rounded-xl hover:bg-[rgba(252,39,121,0.08)]"
          title="Open sidebar"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={resetToHome}
          title="Back to home"
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-pink-glow transition-opacity hover:opacity-75"
          style={{ background: 'linear-gradient(135deg, #FC2779 0%, #C4124E 100%)' }}
        >
          N
        </button>
      </div>
    )
  }

  return (
    <aside
      className="w-[280px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #09101E 0%, #080B12 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={resetToHome}
          title="Back to home"
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-pink-glow flex-shrink-0 transition-opacity group-hover:opacity-75"
            style={{ background: 'linear-gradient(135deg, #FC2779 0%, #C4124E 100%)' }}
          >
            <span className="text-white font-black text-base tracking-tight">iQ</span>
          </div>
          <div>
            <h1 className="text-gradient-pink font-black text-[0.95rem] leading-tight tracking-tight group-hover:opacity-75 transition-opacity">InsightQ</h1>
            <p className="text-[#334155] text-[0.68rem] mt-0.5 font-medium tracking-wide uppercase">Conversational Analytics</p>
          </div>
        </button>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-[#334155] hover:text-[#64748B] transition-colors p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* ── User Info ───────────────────────────────────── */}
        <div
          className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
          style={{ background: 'rgba(252,39,121,0.05)', border: '1px solid rgba(252,39,121,0.12)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#FC2779] flex-shrink-0"
              style={{ background: 'rgba(252,39,121,0.12)' }}
            >
              <User size={13} />
            </div>
            <span className="text-[#CBD5E1] text-xs font-semibold truncate max-w-[120px]">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-[#475569] hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-[rgba(239,68,68,0.08)]"
          >
            <LogOut size={13} />
          </button>
        </div>

        {/* ── AI Model ────────────────────────────────────── */}
        <Section icon={<BotMessageSquare size={13} />} title="AI Model">
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => selectModel(e.target.value)}
              className="w-full text-sm appearance-none cursor-pointer pr-8"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.75rem',
                padding: '0.55rem 0.875rem',
                color: '#CBD5E1',
                outline: 'none',
              }}
            >
              {availableModels.length > 0 ? (
                availableModels.map((m) => (
                  <option key={m.id} value={m.id} style={{ background: '#0A0D18' }}>
                    {m.label}
                  </option>
                ))
              ) : (
                <option value="gemini-2.5-flash" style={{ background: '#0A0D18' }}>
                  Gemini 2.5 Flash
                </option>
              )}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none"
            />
          </div>
          <p className="text-[#334155] text-[0.67rem] mt-1">More models coming soon</p>
        </Section>

        {/* ── Data Source ─────────────────────────────────── */}
        <Section icon={<Database size={13} />} title="Data Source">
          <div className="space-y-3">
            <div className="flex rounded-xl overflow-hidden p-0.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {['default', 'upload'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setDataMode(mode)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    dataMode === mode ? 'text-white shadow-sm' : 'text-[#475569] hover:text-[#94A3B8]'
                  }`}
                  style={dataMode === mode ? { background: 'linear-gradient(135deg, #FC2779 0%, #C4124E 100%)' } : {}}
                >
                  {mode === 'default' ? 'Default Dataset' : 'Upload CSV'}
                </button>
              ))}
            </div>

            {dataMode === 'default' ? (
              <button onClick={loadDefaultDataset} disabled={loading} className="btn-primary w-full text-sm py-2.5">
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Database size={13} />}
                {loading ? 'Loading…' : 'Load Default Dataset'}
              </button>
            ) : (
              <div>
                <input type="file" accept=".csv" ref={fileRef} onChange={handleUpload} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="btn-ghost w-full text-sm py-2.5 border-dashed"
                >
                  <Upload size={13} />
                  {loading ? 'Uploading…' : 'Choose CSV File'}
                </button>
                <p className="text-[#334155] text-[0.68rem] mt-2 text-center">
                  Any CSV — the AI adapts automatically
                </p>
              </div>
            )}

            {dbReady && datasetInfo && (
              <div
                className="rounded-xl p-3.5 space-y-1.5"
                style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px rgba(74,222,128,0.6)' }} />
                  <span className="text-green-400 text-xs font-bold tracking-wide">Dataset Ready</span>
                </div>
                <p className="text-[#64748B] text-[0.72rem]">
                  {datasetInfo.rows?.toLocaleString()} rows · {datasetInfo.columns?.length} columns
                </p>
                <p className="text-[#475569] text-[0.68rem] font-mono truncate">{datasetInfo.table_name}</p>
              </div>
            )}
          </div>
        </Section>

        {/* ── Try These (Dynamic) ─────────────────────────── */}
        {dbReady && (
          <Section icon={<Sparkles size={13} />} title="Try These">
            {suggestionsLoading ? (
              <div className="flex items-center gap-2 py-3 px-1">
                <RefreshCw size={12} className="animate-spin text-[#FC2779]" />
                <span className="text-[#475569] text-xs">Generating suggestions…</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-1.5">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendQuery(q)}
                    disabled={loading}
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    className="w-full text-left text-[0.76rem] text-[#64748B] hover:text-[#E2E8F0]
                               px-3 py-2.5 rounded-xl transition-all duration-150
                               hover:border-nykaa-pink/30 hover:bg-[rgba(252,39,121,0.04)]
                               disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <span className="group-hover:text-gradient-pink">{q}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[#334155] text-[0.72rem] py-1">
                Load a dataset to see AI-generated suggestions.
              </p>
            )}
          </Section>
        )}

        {/* ── Chat Sessions ──────────────────────────────── */}
        <Section
          icon={<History size={13} />}
          title="Chat Sessions"
          action={
            <button
              onClick={() => { setHistoryOpen(v => !v); refreshSessions() }}
              className="text-[#334155] hover:text-[#64748B] transition-colors"
            >
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`}
              />
            </button>
          }
        >
          {historyOpen && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {chatSessions.length === 0 ? (
                <p className="text-[#334155] text-[0.72rem] py-1">No sessions yet. Load a dataset to start.</p>
              ) : (
                chatSessions.map((s) => {
                  const isActive = s.id === currentSessionId
                  const date = new Date(s.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  const msgCount = Math.floor(s.message_count / 2) // pairs of user+assistant
                  return (
                    <div
                      key={s.id}
                      className="relative group/session"
                    >
                      <button
                        onClick={() => loadSession(s)}
                        title={`${s.dataset_name} · ${s.message_count} messages`}
                        style={{
                          background: isActive ? 'rgba(252,39,121,0.07)' : 'rgba(255,255,255,0.02)',
                          border: isActive ? '1px solid rgba(252,39,121,0.25)' : '1px solid rgba(255,255,255,0.04)',
                        }}
                        className="w-full text-left px-3 py-2.5 pr-8 rounded-xl transition-all duration-150
                                   hover:border-[rgba(252,39,121,0.2)] hover:bg-[rgba(252,39,121,0.05)]
                                   group"
                      >
                        {/* Dataset name */}
                        <p className={`text-[0.76rem] font-semibold truncate transition-colors ${
                          isActive ? 'text-[#FC2779]' : 'text-[#94A3B8] group-hover:text-[#E2E8F0]'
                        }`}>
                          {s.dataset_name}
                        </p>
                        {/* Meta row */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[#2D3A4A] text-[0.64rem]">{date}</span>
                          <span className="text-[#2D3A4A] text-[0.6rem]">·</span>
                          <span className="text-[#2D3A4A] text-[0.64rem]">
                            {msgCount} {msgCount === 1 ? 'question' : 'questions'}
                          </span>
                          {isActive && (
                            <span className="ml-auto text-[#FC2779] text-[0.62rem] font-semibold uppercase tracking-wide">active</span>
                          )}
                        </div>
                      </button>
                      {/* Delete button — appears on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                        title="Delete session"
                        className="absolute right-2 top-1/2 -translate-y-1/2
                                   opacity-0 group-hover/session:opacity-100
                                   transition-opacity duration-150
                                   w-6 h-6 rounded-lg flex items-center justify-center
                                   text-[#475569] hover:text-red-400
                                   hover:bg-[rgba(239,68,68,0.1)]"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </Section>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      {dbReady && (
        <div className="px-4 py-3.5 flex gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={clearChat} className="btn-danger flex-1 text-xs py-2">
            <Trash2 size={11} /> Clear Chat
          </button>
          <button onClick={handleSchema} className="btn-ghost flex-1 text-xs py-2">
            <FileCode2 size={11} />
            {schemaVisible ? 'Hide' : 'Schema'}
          </button>
        </div>
      )}

      {/* ── Schema ───────────────────────────────────────── */}
      {schemaVisible && schemaText && (
        <div className="px-4 pb-4 max-h-60 overflow-y-auto animate-fade-in">
          <div className="rounded-xl p-3"
            style={{ background: 'rgba(4,6,14,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[#FC2779] text-xs font-bold tracking-wide uppercase">Schema</span>
              <button onClick={() => setSchemaVisible(false)} className="text-[#334155] hover:text-[#64748B] transition-colors">
                <X size={12} />
              </button>
            </div>
            <pre className="text-[#64748B] text-[0.68rem] font-mono whitespace-pre-wrap leading-relaxed">
              {schemaText}
            </pre>
          </div>
        </div>
      )}
    </aside>
  )
}

function Section({ icon, title, children, action }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#FC2779] opacity-70">{icon}</span>
          <span className="section-label">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
