import { useState } from 'react'
import { BarChart3, User, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { login as apiLogin, register as apiRegister } from '../api/client'
import toast from 'react-hot-toast'

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login')   // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      const data = mode === 'login'
        ? await apiLogin(username.trim(), password)
        : await apiRegister(username.trim(), password)
      toast.success(mode === 'login' ? `Welcome back, ${data.username}!` : `Account created! Welcome, ${data.username}!`)
      onLogin(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #080B12 50%, #0A0D18 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(252,39,121,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-pink-glow"
              style={{ background: 'linear-gradient(135deg, #FC2779 0%, #C4124E 100%)' }}
            >
              <BarChart3 size={28} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-[#E2E8F0] leading-tight">
            <span className="text-gradient-pink">Nykaa</span> BI
          </h1>
          <p className="text-[#475569] text-sm mt-1">Conversational Analytics Dashboard</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'rgba(12,16,28,0.9)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Mode Toggle */}
          <div
            className="flex rounded-xl overflow-hidden p-0.5 mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === m ? 'text-white' : 'text-[#475569] hover:text-[#94A3B8]'
                }`}
                style={mode === m ? { background: 'linear-gradient(135deg, #FC2779 0%, #C4124E 100%)' } : {}}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-[#64748B] text-xs font-semibold mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  autoComplete="username"
                  required
                  className="input-base pl-9 text-sm"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
              {mode === 'register' && (
                <p className="text-[#334155] text-[0.68rem] mt-1">3–20 characters, letters, numbers, underscores</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[#64748B] text-xs font-semibold mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="input-base pl-9 text-sm"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="btn-primary w-full py-3 text-sm font-semibold mt-2"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ArrowRight size={15} />
              )}
              {loading
                ? mode === 'login' ? 'Signing in…' : 'Creating account…'
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#1E2A3A] text-[0.7rem] mt-5">
          Powered by Google Gemini · Nykaa BI Dashboard
        </p>
      </div>
    </div>
  )
}
