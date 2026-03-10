import { Cpu, Database, BarChart3, Zap, Sparkles } from 'lucide-react'

const STEP_ICONS = {
  'Analysing': <Cpu size={12} />,
  'Generating': <Zap size={12} />,
  'Querying':   <Database size={12} />,
  'Selecting':  <BarChart3 size={12} />,
  'Rendering':  <Sparkles size={12} />,
}

function getIcon(step) {
  for (const key of Object.keys(STEP_ICONS)) {
    if (step?.startsWith(key)) return STEP_ICONS[key]
  }
  return <Zap size={12} />
}

export default function LoadingBubble({ step }) {
  return (
    <div className="flex items-start gap-2.5 animate-fade-up">
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center animate-pulse-glow"
        style={{ background: 'linear-gradient(135deg, #FC2779 0%, #C4124E 100%)', boxShadow: '0 0 20px rgba(252,39,121,0.4)' }}
      >
        <span className="text-white text-xs font-black">N</span>
      </div>

      {/* Bubble */}
      <div
        className="px-5 py-4 rounded-2xl rounded-tl-sm min-w-[240px]"
        style={{
          background: 'linear-gradient(160deg, rgba(20,24,38,0.95), rgba(12,15,24,0.98))',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span style={{ color: '#FC2779' }}>{getIcon(step)}</span>
          <span className="text-[#64748B] text-sm">{step || 'Thinking…'}</span>
        </div>

        {/* Progress track */}
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FC2779, #A855F7)',
              animation: 'indeterminate 1.8s ease-in-out infinite',
              transformOrigin: 'left center',
            }}
          />
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5 mt-3">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="text-[#334155] text-[0.7rem] ml-2 font-medium">AI is crafting your chart…</span>
        </div>
      </div>

      <style>{`
        @keyframes indeterminate {
          0%   { transform: translateX(-100%) scaleX(0.3); }
          50%  { transform: translateX(0%)    scaleX(0.7); }
          100% { transform: translateX(100%)  scaleX(0.3); }
        }
      `}</style>
    </div>
  )
}
