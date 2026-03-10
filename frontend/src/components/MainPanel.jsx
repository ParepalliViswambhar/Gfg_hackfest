import { useApp } from '../context/AppContext'
import MetricBar from './MetricBar'
import ChatArea from './ChatArea'
import QueryInput from './QueryInput'
import EmptyState from './EmptyState'

export default function MainPanel() {
  const { dbReady, datasetInfo, messages } = useApp()

  return (
    <main className="flex-1 flex flex-col overflow-hidden" style={{ background: '#080B12' }}>
      {/* ── Header ──────────────────────────────────────── */}
      <header
        className="flex-shrink-0 px-6 py-4"
        style={{
          background: 'linear-gradient(180deg, rgba(12,15,24,0.98) 0%, rgba(8,11,18,0.95) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[1.05rem] font-black leading-tight tracking-tight">
                <span className="text-gradient-pink">Nykaa</span>
                <span className="text-[#1E2A3A] mx-2 font-light">|</span>
                <span className="text-[#CBD5E1] font-medium">Chat with your Data</span>
              </h1>
            </div>
            <p className="text-[#334155] text-[0.7rem] mt-0.5 font-medium">
              Powered by Google Gemini &nbsp;·&nbsp; Ask in plain English → instant charts
            </p>
          </div>

          {dbReady && datasetInfo && (
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <span className="pill-green text-[0.7rem]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.7)' }} />
                {datasetInfo.rows?.toLocaleString()} rows
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Metric bar ───────────────────────────────────── */}
      {dbReady && datasetInfo?.metrics?.length > 0 && (
        <MetricBar metrics={datasetInfo.metrics} />
      )}

      {/* ── Chat / empty state ───────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col mesh-bg">
        {dbReady || messages.length > 0 ? <ChatArea /> : <EmptyState />}
      </div>

      {/* ── Query input ──────────────────────────────────── */}
      {dbReady && <QueryInput />}
    </main>
  )
}
