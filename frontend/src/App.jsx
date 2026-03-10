import { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import LoginPage from './components/LoginPage'
import { authMe } from './api/client'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('nykaa_auth_token')
    if (!token) {
      setChecking(false)
      return
    }
    authMe()
      .then((data) => setUser({ token, username: data.username, user_id: data.user_id }))
      .catch(() => {
        localStorage.removeItem('nykaa_auth_token')
        localStorage.removeItem('nykaa_username')
      })
      .finally(() => setChecking(false))
  }, [])

  const handleLogin = (data) => {
    localStorage.setItem('nykaa_auth_token', data.token)
    localStorage.setItem('nykaa_username', data.username)
    setUser(data)
  }

  const handleLogout = () => {
    localStorage.removeItem('nykaa_auth_token')
    localStorage.removeItem('nykaa_username')
    setUser(null)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080B12' }}>
        <div className="w-8 h-8 rounded-full border-2 border-[#FC2779] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <AppProvider user={user} onLogout={handleLogout}>
      <div className="flex h-screen overflow-hidden" style={{ background: '#080B12' }}>
        <Sidebar />
        <MainPanel />
      </div>
    </AppProvider>
  )
}
