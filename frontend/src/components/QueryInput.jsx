import { useState, useRef, useEffect } from 'react'
import { Send, CornerDownLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function QueryInput() {
  const { sendQuery, loading, dbReady } = useApp()
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  const disabled = loading || !dbReady

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [value])

  const handleSubmit = () => {
    const q = value.trim()
    if (!q || disabled) return
    setValue('')
    sendQuery(q)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className="flex-shrink-0 px-4 md:px-8 py-4"
      style={{
        background: 'rgba(8,11,18,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        className={`flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-200 ${
          disabled ? 'opacity-60' : ''
        }`}
        style={{
          background: 'rgba(14,18,30,0.9)',
          border: !disabled && value.length > 0
            ? '1px solid rgba(252,39,121,0.4)'
            : '1px solid rgba(255,255,255,0.08)',
          boxShadow: !disabled && value.length > 0
            ? '0 0 0 3px rgba(252,39,121,0.06), 0 8px 32px rgba(0,0,0,0.4)'
            : '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            !dbReady
              ? 'Load a dataset from the sidebar to start…'
              : 'Ask a business question… e.g. "Show monthly revenue by campaign type"'
          }
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none
                     text-[#E2E8F0] text-sm placeholder:text-[#2D3A52]
                     leading-relaxed max-h-36 overflow-y-auto no-scrollbar"
        />

        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
                     disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            background: value.trim() && !disabled
              ? 'linear-gradient(135deg, #FC2779 0%, #C4124E 100%)'
              : 'rgba(255,255,255,0.05)',
            boxShadow: value.trim() && !disabled ? '0 4px 16px rgba(252,39,121,0.4)' : 'none',
          }}
          title="Send (Enter)"
        >
          {loading
            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send size={14} className={value.trim() && !disabled ? 'text-white' : 'text-[#334155]'} />}
        </button>
      </div>

      {/* Hint */}
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[#1E2A3A] text-[0.65rem]">
          {!disabled && (
            <span className="flex items-center gap-1.5">
              <CornerDownLeft size={9} />
              Enter to send &nbsp;·&nbsp; Shift+Enter for new line
            </span>
          )}
        </p>
        {value.length > 80 && (
          <span className="text-[#334155] text-[0.65rem]">{value.length}</span>
        )}
      </div>
    </div>
  )
}
