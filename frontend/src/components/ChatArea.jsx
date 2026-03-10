import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import ChatMessage from './ChatMessage'
import LoadingBubble from './LoadingBubble'

export default function ChatArea() {
  const { messages, loading, loadingStep, sendQuery } = useApp()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'rgba(252,39,121,0.07)',
              border: '1px solid rgba(252,39,121,0.15)',
            }}
          >
            <span className="text-3xl">💬</span>
          </div>
          <p className="text-[#475569] text-sm font-medium">
            Type a question below to generate your first chart
          </p>
          <p className="text-[#1E2A3A] text-xs mt-1.5">
            e.g. "Show monthly revenue by campaign type for 2025"
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} onChipClick={sendQuery} />
      ))}

      {loading && <LoadingBubble step={loadingStep} />}

      <div ref={bottomRef} />
    </div>
  )
}
