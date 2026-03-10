import { useState, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Label, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Brush,
} from 'recharts'
import { ChevronDown, ChevronUp, Code2, Table2, Download, Image, Sparkles } from 'lucide-react'
import { toPng } from 'html-to-image'

// ─── Nykaa color palette ────────────────────────────────────────────────────
const COLORS = [
  '#FC2779', '#A855F7', '#38BDF8', '#F59E0B',
  '#34D399', '#F97316', '#FB7185', '#C084FC',
  '#22D3EE', '#FBBF24',
]// Per-color glow shadows (matches COLORS index)
const GLOWS = [
  'rgba(252,39,121,0.5)', 'rgba(168,85,247,0.5)', 'rgba(56,189,248,0.5)', 'rgba(245,158,11,0.5)',
  'rgba(52,211,153,0.5)', 'rgba(249,115,22,0.5)', 'rgba(251,113,133,0.5)', 'rgba(192,132,252,0.5)',
  'rgba(34,211,238,0.5)', 'rgba(251,191,36,0.5)',
]
// ─── Format numbers compactly ───────────────────────────────────────────────
function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return v
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// ─── Normalise native chart descriptor from backend ──────────────────────────
function parseNative(chartJson) {
  if (!chartJson) return null
  try {
    const d = typeof chartJson === 'string' ? JSON.parse(chartJson) : chartJson
    if (!d || !d.type || !Array.isArray(d.data)) return null
    return d
  } catch { return null }
}

// ─── Shared style constants ─────────────────────────────────────────────────
const TICK = { fill: '#4B5563', fontSize: 11, fontFamily: 'Inter, sans-serif' }
const GRID = { stroke: 'rgba(255,255,255,0.045)', strokeDasharray: '3 6' }
const M    = { top: 16, right: 28, bottom: 36, left: 12 }
const LEG  = { fontSize: 12, color: '#64748B' }

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(8,10,20,0.96)', backdropFilter: 'blur(24px)',
      border: '1px solid rgba(252,39,121,0.28)', borderRadius: 16,
      padding: '12px 16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
      minWidth: 148,
    }}>
      {label != null && (
        <p style={{
          color: '#94A3B8', fontSize: 10, marginBottom: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12 }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: p.color || p.fill, flexShrink: 0,
              boxShadow: `0 0 10px ${p.color || p.fill}`,
            }} />
            {p.name && p.name !== 'value' && (
              <span style={{ color: '#64748B', fontSize: 11 }}>{p.name}:</span>
            )}
            <span style={{ color: '#F8FAFC', fontWeight: 700, marginLeft: 'auto', paddingLeft: 14, fontSize: 13 }}>
              {typeof p.value === 'number' ? fmt(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bar ────────────────────────────────────────────────────────────────────
function BarChartView({ info }) {
  const { data, series = ['Value'] } = info
  const single = series.length === 1
  return (
    <ResponsiveContainer width="100%" height={370}>
      <BarChart data={data} margin={M} barCategoryGap="30%">
        <defs>
          <filter id="barGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {single
            ? data.map((_, i) => {
                const c = COLORS[i % COLORS.length]
                return (
                  <linearGradient key={i} id={`bgs${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={0.97} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.3} />
                  </linearGradient>
                )
              })
            : series.map((s, i) => {
                const c = COLORS[i % COLORS.length]
                return (
                  <linearGradient key={s} id={`bgm${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.38} />
                  </linearGradient>
                )
              })}
        </defs>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} width={54} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(252,39,121,0.06)', rx: 6 }} />
        {series.length > 1 && <Legend wrapperStyle={LEG} />}
        {single ? (
          <Bar dataKey={series[0]} radius={[8, 8, 0, 0]} maxBarSize={62}>
            {data.map((_, i) => (
              <Cell key={i}
                fill={`url(#bgs${i})`}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={0.5}
                strokeOpacity={0.4}
              />
            ))}
          </Bar>
        ) : (
          series.map((s, i) => (
            <Bar key={s} dataKey={s} fill={`url(#bgm${i})`} radius={[8, 8, 0, 0]} maxBarSize={58} />
          ))
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Horizontal Bar ─────────────────────────────────────────────────────────
function HBarView({ info }) {
  const { data } = info
  const yWidth = Math.min(Math.max(...data.map(d => String(d.name).length)) * 7 + 16, 200)
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 44, bottom: 8, left: 8 }}>
        <defs>
          {data.map((_, i) => {
            const c = COLORS[i % COLORS.length]
            return (
              <linearGradient key={i} id={`hb${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FC2779" stopOpacity={0.55} />
                <stop offset="100%" stopColor={c} stopOpacity={0.97} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid {...GRID} horizontal={false} />
        <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
        <YAxis type="category" dataKey="name" tick={TICK} axisLine={false} tickLine={false} width={yWidth} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(252,39,121,0.05)' }} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={32}>
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#hb${i})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Line ────────────────────────────────────────────────────────────────────
function LineChartView({ info }) {
  const { data, series = ['Value'] } = info
  return (
    <ResponsiveContainer width="100%" height={370}>
      <LineChart data={data} margin={M}>
        <defs>
          <filter id="lineGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} width={54} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(252,39,121,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} />
        {series.length > 1 && <Legend wrapperStyle={LEG} />}
        {series.map((s, i) => {
          const c = COLORS[i % COLORS.length]
          return (
            <Line key={s} type="monotone" dataKey={s} stroke={c} strokeWidth={3}
              dot={{ fill: c, strokeWidth: 2, stroke: 'rgba(0,0,0,0.5)', r: 4 }}
              activeDot={{ r: 7, stroke: '#080B12', strokeWidth: 2.5, fill: c, filter: 'url(#lineGlow)' }}
            />
          )
        })}
        {data.length > 10 && (
          <Brush dataKey="name" height={22} stroke="rgba(252,39,121,0.3)" fill="rgba(8,10,20,0.8)"
            travellerWidth={8} style={{ fontSize: 10, color: '#64748B' }} />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Area ────────────────────────────────────────────────────────────────────
function AreaChartView({ info }) {
  const { data, series = ['Value'] } = info
  return (
    <ResponsiveContainer width="100%" height={370}>
      <AreaChart data={data} margin={M}>
        <defs>
          {series.map((s, i) => {
            const c = COLORS[i % COLORS.length]
            return (
              <linearGradient key={s} id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.55} />
                <stop offset="55%" stopColor={c} stopOpacity={0.14} />
                <stop offset="100%" stopColor={c} stopOpacity={0.0} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} width={54} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(252,39,121,0.35)', strokeWidth: 1, strokeDasharray: '4 4' }} />
        {series.length > 1 && <Legend wrapperStyle={LEG} />}
        {series.map((s, i) => {
          const c = COLORS[i % COLORS.length]
          return (
            <Area key={s} type="monotone" dataKey={s} stroke={c} strokeWidth={3}
              fill={`url(#ag${i})`} dot={false}
              activeDot={{ r: 7, stroke: '#080B12', strokeWidth: 2.5, fill: c }}
            />
          )
        })}
        {data.length > 10 && (
          <Brush dataKey="name" height={22} stroke="rgba(252,39,121,0.3)" fill="rgba(8,10,20,0.8)"
            travellerWidth={8} style={{ fontSize: 10, color: '#64748B' }} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Pie / Donut ─────────────────────────────────────────────────────────────
function PieChartView({ info }) {
  const { data } = info
  const [active, setActive] = useState(null)
  const total = data.reduce((s, d) => s + (d.value || 0), 0)

  const CenterLabel = ({ viewBox }) => {
    const { cx, cy } = viewBox || {}
    if (!cx) return null
    return (
      <g>
        <text x={cx} y={cy - 9} textAnchor="middle"
          fill="#64748B" fontSize={11} fontFamily="Inter, sans-serif" fontWeight="600">Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle"
          fill="#F1F5F9" fontSize={20} fontFamily="Inter, sans-serif" fontWeight="800">
          {fmt(total)}
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={390}>
      <PieChart>
        <defs>
          {data.map((_, i) => {
            const c = COLORS[i % COLORS.length]
            return (
              <radialGradient key={i} id={`pg${i}`} cx="50%" cy="50%">
                <stop offset="0%"   stopColor={c} stopOpacity={1} />
                <stop offset="100%" stopColor={c} stopOpacity={0.7} />
              </radialGradient>
            )
          })}
        </defs>
        <Pie data={data} dataKey="value" nameKey="name"
          cx="50%" cy="46%" outerRadius={150} innerRadius={70} paddingAngle={2}
          onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}
        >
          {data.map((_, i) => (
            <Cell key={i}
              fill={`url(#pg${i})`}
              stroke="rgba(8,10,20,0.6)" strokeWidth={2}
              opacity={active === null || active === i ? 1 : 0.4}
              style={{ transition: 'opacity 0.25s ease', cursor: 'pointer' }}
            />
          ))}
          <Label content={<CenterLabel />} position="center" />
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={val => (
          <span style={{ color: '#8B8FA8', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{val}</span>
        )} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Scatter ─────────────────────────────────────────────────────────────────
function ScatterView({ info }) {
  const { data, xLabel, yLabel } = info
  return (
    <ResponsiveContainer width="100%" height={370}>
      <ScatterChart margin={M}>
        <CartesianGrid {...GRID} />
        <XAxis type="number" dataKey="x" name={xLabel || 'X'}
          tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -14, fill: '#6B7094', fontSize: 11 } : undefined}
        />
        <YAxis type="number" dataKey="y" name={yLabel || 'Y'}
          tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} width={54}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(252,39,121,0.2)' }} />
        <Scatter data={data}>
          {data.map((_, i) => (
            <Cell key={i}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.82}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={0.5}
              strokeOpacity={0.35}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// ─── Funnel ───────────────────────────────────────────────────────────────────
function FunnelView({ info }) {
  const { data } = info
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 54)}>
      <FunnelChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <Tooltip content={<CustomTooltip />} />
        <Funnel dataKey="value" data={data} isAnimationActive>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          <LabelList position="center" fill="#fff" fontSize={12} dataKey="name" />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  )
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────
function HeatmapView({ info }) {
  const { rows = [], cols = [], data = [], maxValue = 1, xLabel, yLabel } = info
  if (!rows.length || !cols.length) return (
    <div className="flex items-center justify-center h-40 text-[#334155] text-sm">No heatmap data</div>
  )
  const cellW = Math.max(52, Math.min(100, Math.floor(540 / cols.length)))
  return (
    <div style={{ padding: '16px 8px 8px' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'inline-grid',
          gridTemplateColumns: `max-content repeat(${cols.length}, ${cellW}px)`,
          gap: 4,
          minWidth: 'max-content',
        }}>
          {/* Header row */}
          <div />
          {cols.map(c => (
            <div key={c} style={{
              textAlign: 'center', color: '#94A3B8', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '0 4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: cellW,
            }} title={c}>{c}</div>
          ))}
          {/* Data rows */}
          {rows.map(r => [
            <div key={`lbl-${r}`} style={{
              display: 'flex', alignItems: 'center', paddingRight: 10,
              color: '#64748B', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
              maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis',
            }} title={r}>{r}</div>,
            ...cols.map(c => {
              const cell = data.find(d => d.row === r && d.col === c)
              const val = cell?.value ?? 0
              const norm = maxValue > 0 ? Math.min(val / maxValue, 1) : 0
              const alpha = (0.08 + norm * 0.88).toFixed(2)
              const textColor = norm > 0.45 ? '#fff' : '#64748B'
              return (
                <div key={`${r}-${c}`}
                  title={`${r} × ${c}: ${val}`}
                  style={{
                    height: 38, borderRadius: 7,
                    background: `rgba(252,39,121,${alpha})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: textColor, fontSize: 10, fontWeight: 700,
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'default', transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: norm > 0.7 ? `0 0 12px rgba(252,39,121,${(norm * 0.4).toFixed(2)})` : 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.zIndex = '10' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1' }}
                >
                  {val >= 1_000_000 ? `${(val/1_000_000).toFixed(1)}M`
                    : val >= 1000 ? `${(val/1000).toFixed(1)}K`
                    : val % 1 ? val.toFixed(1) : val.toFixed(0)}
                </div>
              )
            }),
          ])}
        </div>
      </div>
      {/* Color legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingLeft: 4 }}>
        <span style={{ color: '#475569', fontSize: 10 }}>Low</span>
        <div style={{
          flex: 1, maxWidth: 140, height: 8, borderRadius: 4,
          background: 'linear-gradient(90deg, rgba(252,39,121,0.08), rgba(252,39,121,0.96))',
          border: '1px solid rgba(255,255,255,0.06)',
        }} />
        <span style={{ color: '#475569', fontSize: 10 }}>High</span>
        {(xLabel || yLabel) && (
          <span style={{ color: '#334155', fontSize: 10, marginLeft: 12 }}>
            {yLabel || xLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────
function ChartRenderer({ info }) {
  switch (info.type) {
    case 'bar':            return <BarChartView info={info} />
    case 'horizontal_bar': return <HBarView info={info} />
    case 'line':           return <LineChartView info={info} />
    case 'area':           return <AreaChartView info={info} />
    case 'pie':            return <PieChartView info={info} />
    case 'scatter':        return <ScatterView info={info} />
    case 'funnel':         return <FunnelView info={info} />
    case 'heatmap':        return <HeatmapView info={info} />
    default:               return <BarChartView info={info} />
  }
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
export default function ChartCard({ title, chartJson, sql, rowCount, data, columns, insight }) {
  const [showSql, setShowSql] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [exportingPng, setExportingPng] = useState(false)
  const chartRef = useRef(null)

  const chartInfo = parseNative(chartJson)
  const displayTitle = title || chartInfo?.title || 'Chart'

  const handleDownloadCsv = () => {
    if (!columns || !data) return
    const csvRows = [columns.join(',')]
    data.forEach(row => {
      csvRows.push(columns.map(c => JSON.stringify(row[c] ?? '')).join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url ; a.download = `${displayTitle}.csv` ; a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPng = async () => {
    if (!chartRef.current || exportingPng) return
    setExportingPng(true)
    try {
      const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#0D0F1C' })
      const a = document.createElement('a')
      a.href = dataUrl ; a.download = `${displayTitle}.png` ; a.click()
    } catch (e) {
      console.error('PNG export failed', e)
    } finally {
      setExportingPng(false)
    }
  }

  return (
    <div className="chart-card overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-[3px] h-5 rounded-full flex-shrink-0"
            style={{ background: 'linear-gradient(180deg, #FC2779, #A855F7)' }} />
          <h3 className="text-[#CBD5E1] font-bold text-sm truncate leading-tight">{displayTitle}</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {rowCount != null && (
            <span
              className="text-[#334155] text-[0.62rem] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {rowCount.toLocaleString()} rows
            </span>
          )}
          <button
            onClick={handleDownloadPng}
            disabled={exportingPng}
            className="text-[#334155] hover:text-purple-400 transition-colors p-1.5 rounded-lg disabled:opacity-40"
            style={{ background: 'transparent' }}
            title="Download as PNG"
          >
            <Image size={13} />
          </button>
          <button
            onClick={handleDownloadCsv}
            className="text-[#334155] hover:text-nykaa-pink transition-colors p-1.5 rounded-lg"
            style={{ background: 'transparent' }}
            title="Download CSV"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartInfo ? (
        <div ref={chartRef} className="px-2 pb-2">
          <ChartRenderer info={chartInfo} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-[#334155] text-sm">
          Chart unavailable
        </div>
      )}

      {/* AI Insight callout */}
      {insight && (
        <div className="mx-4 mb-3 px-4 py-3 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(252,39,121,0.07) 0%, rgba(168,85,247,0.07) 100%)',
            border: '1px solid rgba(252,39,121,0.18)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} style={{ color: '#FC2779', flexShrink: 0 }} />
            <span style={{ color: '#FC2779', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AI Insight
            </span>
          </div>
          <p style={{ color: '#CBD5E1', fontSize: 12.5, lineHeight: 1.65 }}>{insight}</p>
        </div>
      )}

      {/* Footer toggles */}
      <div className="px-4 py-2.5 flex gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <ToggleBtn icon={<Code2 size={11} />} label="SQL" active={showSql} onClick={() => setShowSql(v => !v)} />
        <ToggleBtn icon={<Table2 size={11} />} label={`Data (${rowCount ?? 0})`} active={showTable} onClick={() => setShowTable(v => !v)} />
      </div>

      {showSql && sql && (
        <div className="px-4 pb-4 animate-fade-in">
          <pre className="sql-block">{sql}</pre>
        </div>
      )}

      {showTable && data?.length > 0 && (
        <div className="px-4 pb-4 animate-fade-in overflow-x-auto">
          <DataTable columns={columns} data={data} />
        </div>
      )}
    </div>
  )
}

function ToggleBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all duration-200"
      style={active ? {
        background: 'rgba(252,39,121,0.1)',
        color: '#FC2779',
        border: '1px solid rgba(252,39,121,0.25)',
      } : {
        background: 'transparent',
        color: '#475569',
        border: '1px solid transparent',
      }}
    >
      {icon}{label}
      {active ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
    </button>
  )
}

function DataTable({ columns, data }) {
  const PAGE_SIZE = 10
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(data.length / PAGE_SIZE)
  const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  return (
    <div className="space-y-2.5">
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ background: 'rgba(252,39,121,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {columns?.map(col => (
                <th key={col} className="px-3.5 py-2.5 text-left font-bold whitespace-nowrap tracking-wide"
                  style={{ color: '#FC2779' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr
                key={i}
                className="transition-colors"
                style={{
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(252,39,121,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}
              >
                {columns?.map(col => (
                  <td key={col} className="px-3.5 py-2 whitespace-nowrap max-w-[200px] truncate"
                    style={{ color: '#64748B' }}>
                    {row[col] != null ? String(row[col]) : '\u2014'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs" style={{ color: '#334155' }}>
          <span>Page {page + 1} / {totalPages}</span>
          <div className="flex gap-1.5">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="btn-ghost py-1 px-2.5 text-xs disabled:opacity-30">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="btn-ghost py-1 px-2.5 text-xs disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
