import ChartCard from './ChartCard'
import { AlertTriangle, HelpCircle, User, Bot, Sparkles, Database, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ChatMessage({ message, onChipClick }) {
  const { datasetInfo } = useApp()
  const { role, type, content, message: errMsg, title, chart_json, sql,
          row_count, data, columns, is_followup, cannot_answer,
          insight, followup_chips, charts, available_columns } = message

  /* ── User bubble ──────────────────────────────────────────────────────── */
  if (role === 'user') {
    return (
      <div className="flex items-end gap-2.5 justify-end animate-fade-up">
        <div
          className="max-w-xl px-4 py-3 text-[#E2E8F0] text-sm leading-relaxed rounded-2xl rounded-br-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(252,39,121,0.14) 0%, rgba(168,85,247,0.1) 100%)',
            border: '1px solid rgba(252,39,121,0.22)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          }}
        >
          {content}
        </div>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(252,39,121,0.2), rgba(168,85,247,0.2))',
            border: '1px solid rgba(252,39,121,0.3)',
          }}
        >
          <User size={13} style={{ color: '#FC2779' }} />
        </div>
      </div>
    )
  }

  /* ── Error ────────────────────────────────────────────────────────────── */
  if (type === 'error') {
    return (
      <div className="flex items-start gap-2.5 animate-fade-up">
        <AssistantAvatar error />
        <div
          className="max-w-2xl rounded-2xl rounded-tl-sm px-4 py-3.5"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={13} className="text-red-400" />
            <span className="text-red-400 text-sm font-semibold">Could not generate chart</span>
          </div>
          <p className="text-[#FCA5A5] text-sm leading-relaxed">{errMsg || content}</p>
          {sql && (
            <details className="mt-3">
              <summary className="text-[#64748B] text-xs cursor-pointer hover:text-[#94A3B8] transition-colors">View SQL</summary>
              <pre className="sql-block mt-2">{sql}</pre>
            </details>
          )}
        </div>
      </div>
    )
  }

  /* ── Cannot answer ────────────────────────────────────────────────────── */
  if (type === 'cannot_answer') {
    const availableDims = available_columns || datasetInfo?.columns || []
    const categoricalDims = availableDims.filter(c =>
      !['Revenue', 'ROI', 'Conversion_Rate', 'Acquisition_Cost', 'Clicks', 'Impressions', 'Engagement_Score'].includes(c)
    )
    return (
      <div className="flex items-start gap-2.5 animate-fade-up">
        <AssistantAvatar />
        <div
          className="max-w-2xl rounded-2xl rounded-tl-sm px-4 py-3.5"
          style={{
            background: 'rgba(96,165,250,0.05)',
            border: '1px solid rgba(96,165,250,0.15)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <HelpCircle size={13} className="text-blue-400" />
            <span className="text-blue-400 text-sm font-semibold">Can't answer from available data</span>
          </div>
          <p className="text-[#64748B] text-sm leading-relaxed mb-3">{errMsg || content}</p>
          {categoricalDims.length > 0 && (
            <div
              className="rounded-xl px-3.5 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Database size={11} style={{ color: '#38BDF8' }} />
                <span style={{ color: '#38BDF8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Available Dimensions
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categoricalDims.map(dim => (
                  <span key={dim}
                    className="text-[0.7rem] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
                  >
                    {dim}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Multi-chart dashboard ────────────────────────────────────────────── */
  if (type === 'multi_chart') {
    const chartList = charts || []
    return (
      <div className="flex items-start gap-2.5 animate-fade-up">
        <AssistantAvatar />
        <div className="flex-1 min-w-0" style={{ maxWidth: '100%' }}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#FC2779] text-xs font-bold tracking-wide flex items-center gap-1.5">
              <Sparkles size={11} />
              Dashboard Overview
            </span>
            <span
              className="text-[0.62rem] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(168,85,247,0.12)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.25)' }}
            >
              {chartList.length} charts
            </span>
          </div>

          {/* AI insight for dashboard */}
          {insight && (
            <div className="mb-4 px-4 py-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(252,39,121,0.07) 0%, rgba(168,85,247,0.07) 100%)',
                border: '1px solid rgba(252,39,121,0.18)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} style={{ color: '#FC2779' }} />
                <span style={{ color: '#FC2779', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Insight</span>
              </div>
              <p style={{ color: '#CBD5E1', fontSize: 12.5, lineHeight: 1.65 }}>{insight}</p>
            </div>
          )}

          {/* Responsive 2-col grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: chartList.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 14,
          }}>
            {chartList.map((c, i) => (
              <ChartCard key={i}
                title={c.title}
                chartJson={c.chart_json}
                sql={c.sql}
                rowCount={c.row_count}
                data={c.data}
                columns={c.columns}
              />
            ))}
          </div>

          {/* Follow-up chips */}
          {followup_chips?.length > 0 && (
            <FollowupChips chips={followup_chips} onChipClick={onChipClick} />
          )}
        </div>
      </div>
    )
  }

  /* ── Success ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex items-start gap-2.5 animate-fade-up">
      <AssistantAvatar />
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[#FC2779] text-xs font-bold tracking-wide flex items-center gap-1.5">
            <Sparkles size={11} />
            Nykaa BI
          </span>
          {is_followup && (
            <span className="pill-blue text-[0.62rem]">
              <span className="w-1 h-1 rounded-full bg-blue-400 inline-block" />
              Follow-up
            </span>
          )}
        </div>

        <ChartCard
          title={title}
          chartJson={chart_json}
          sql={sql}
          rowCount={row_count}
          data={data}
          columns={columns}
          insight={insight}
        />
        {/* Follow-up suggestion chips */}
        {followup_chips?.length > 0 && (
          <FollowupChips chips={followup_chips} onChipClick={onChipClick} />
        )}
      </div>
    </div>
  )
}

function FollowupChips({ chips, onChipClick }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => onChipClick?.(chip)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: 'rgba(252,39,121,0.08)',
            border: '1px solid rgba(252,39,121,0.25)',
            color: '#FC2779',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(252,39,121,0.18)'
            e.currentTarget.style.borderColor = 'rgba(252,39,121,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(252,39,121,0.08)'
            e.currentTarget.style.borderColor = 'rgba(252,39,121,0.25)'
          }}
        >
          <Zap size={10} />
          {chip}
        </button>
      ))}
    </div>
  )
}

function AssistantAvatar({ error }) {
  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
      style={error ? {
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.25)',
      } : {
        background: 'linear-gradient(135deg, #FC2779 0%, #C4124E 100%)',
        boxShadow: '0 0 16px rgba(252,39,121,0.35)',
      }}
    >
      {error
        ? <AlertTriangle size={12} className="text-red-400" />
        : <Bot size={13} className="text-white" />}
    </div>
  )
}
