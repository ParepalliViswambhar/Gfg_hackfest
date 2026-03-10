import { TrendingUp } from 'lucide-react'

export default function MetricBar({ metrics }) {
  return (
    <div
      className="flex-shrink-0 flex items-center gap-1 px-6 py-2.5 overflow-x-auto no-scrollbar"
      style={{
        background: 'rgba(8,11,18,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <TrendingUp size={12} style={{ color: '#FC2779', flexShrink: 0 }} />
      <div className="flex items-center gap-1.5 ml-2">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
            {i > 0 && <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.06)' }} />}
            <div
              className="px-3 py-1.5 rounded-xl flex flex-col"
              style={{ background: 'rgba(252,39,121,0.06)', border: '1px solid rgba(252,39,121,0.1)' }}
            >
              <span className="text-gradient-pink font-bold text-xs leading-tight">{m.value}</span>
              <span className="text-[0.6rem] font-medium leading-tight" style={{ color: '#334155' }}>{m.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
