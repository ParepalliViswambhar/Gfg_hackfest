import { BarChart3, MessageSquare, Zap, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'

const FEATURES = [
  {
    icon: <MessageSquare size={20} />,
    color: '#FC2779',
    bg: 'rgba(252,39,121,0.08)',
    border: 'rgba(252,39,121,0.18)',
    title: 'Natural Language → SQL',
    desc: 'Type a business question and Gemini converts it to SQL automatically.',
  },
  {
    icon: <BarChart3 size={20} />,
    color: '#A855F7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.18)',
    title: 'Smart Chart Selection',
    desc: 'The AI picks the right chart: line for trends, bar for comparisons, pie for breakdowns.',
  },
  {
    icon: <Zap size={20} />,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.18)',
    title: 'Follow-up Conversations',
    desc: 'Refine charts with follow-ups: "Filter to only Q1" or "Break this down by channel".',
  },
]

const STEPS = [
  { num: '01', label: 'Sign in', sub: 'Your account is ready', done: 'pink' },
  { num: '02', label: 'Load a dataset', sub: 'Nykaa CSV or yours', done: 'purple' },
  { num: '03', label: 'Ask anything', sub: 'In plain English', done: 'amber' },
]

export default function EmptyState() {
  const { loadDefaultDataset, loading } = useApp()

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="text-center mb-10 animate-fade-in">
        {/* Logo blob */}
        <div className="relative inline-flex mb-6">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(252,39,121,0.15) 0%, rgba(168,85,247,0.12) 100%)',
              border: '1px solid rgba(252,39,121,0.2)',
              boxShadow: '0 0 40px rgba(252,39,121,0.15)',
            }}
          >
            <BarChart3 size={32} style={{ color: '#FC2779' }} />
          </div>
          {/* Floating badge */}
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-[0.6rem] font-black"
            style={{ background: 'linear-gradient(135deg, #FC2779, #C4124E)', boxShadow: '0 4px 12px rgba(252,39,121,0.5)' }}
          >
            AI
          </div>
        </div>

        <h2 className="text-3xl font-black text-[#E2E8F0] mb-3 leading-tight">
          Chat with your{' '}
          <span className="text-gradient-pink">Marketing Data</span>
        </h2>
        <p className="text-[#475569] text-sm max-w-md mx-auto leading-relaxed">
          Ask questions in plain English — get beautiful charts and insights instantly, powered by Google Gemini.
        </p>
      </div>

      {/* ── STEPS ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-10 animate-fade-up" style={{ animationDelay: '80ms' }}>
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black"
                style={{
                  background: i === 0
                    ? 'linear-gradient(135deg, rgba(252,39,121,0.15), rgba(252,39,121,0.05))'
                    : i === 1
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                  border: `1px solid ${i === 0 ? 'rgba(252,39,121,0.25)' : i === 1 ? 'rgba(168,85,247,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  color: i === 0 ? '#FC2779' : i === 1 ? '#A855F7' : '#F59E0B',
                }}
              >
                {s.num}
              </div>
              <p className="text-[#E2E8F0] text-[0.74rem] font-semibold mt-2 text-center">{s.label}</p>
              <p className="text-[#334155] text-[0.65rem] text-center">{s.sub}</p>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight size={14} className="text-[#1E2A3A] mt-[-18px] flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* ── FEATURE CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 animate-fade-up"
            style={{
              background: `linear-gradient(160deg, ${f.bg} 0%, rgba(255,255,255,0.01) 100%)`,
              border: `1px solid ${f.border}`,
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              animationDelay: `${i * 100 + 160}ms`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: f.bg, color: f.color }}
            >
              {f.icon}
            </div>
            <h3 className="text-[#CBD5E1] font-bold text-sm mb-1.5">{f.title}</h3>
            <p className="text-[#475569] text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <button
        onClick={loadDefaultDataset}
        disabled={loading}
        className="btn-primary px-8 py-3.5 text-sm animate-pulse-glow animate-fade-up font-bold"
        style={{ animationDelay: '460ms' }}
      >
        {loading ? 'Loading…' : '🚀 Load Nykaa Dataset & Start'}
      </button>
    </div>
  )
}
