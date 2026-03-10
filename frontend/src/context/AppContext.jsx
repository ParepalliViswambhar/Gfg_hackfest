import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  loadDefault as apiLoadDefault,
  uploadCsv as apiUploadCsv,
  runQuery as apiRunQuery,
  clearHistory as apiClearHistory,
  getSchema as apiGetSchema,
  getSuggestions as apiGetSuggestions,
  getChatSessions as apiGetChatSessions,
  getChatSessionMessages as apiGetSessionMessages,
  deleteChatSession as apiDeleteSession,
  getModels as apiGetModels,
  setModel as apiSetModel,
  logout as apiLogout,
} from '../api/client'

const AppContext = createContext(null)

export function AppProvider({ children, user, onLogout }) {
  // ── Dataset ────────────────────────────────────────────────────────
  const [dbReady, setDbReady] = useState(false)
  const [datasetInfo, setDatasetInfo] = useState(null)
  const [schemaText, setSchemaText] = useState('')

  // ── AI Model ────────────────────────────────────────────────────────
  const [availableModels, setAvailableModels] = useState([])
  const [selectedModel, setSelectedModelState] = useState(
    localStorage.getItem('nykaa_model') || 'gemini-2.5-flash'
  )

  // ── Suggestions ───────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // ── User history / sessions ────────────────────────────────────────────
  const [chatSessions, setChatSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)

  // ── Chat ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ─── Startup: load available models + chat sessions ────────────────────────
  useEffect(() => {
    apiGetModels()
      .then((d) => {
        setAvailableModels(d.models || [])
        setSelectedModelState(d.selected || 'gemini-2.5-flash')
      })
      .catch(() => {})

    apiGetChatSessions()
      .then((d) => setChatSessions(d.sessions || []))
      .catch(() => {})
  }, [])

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const selectModel = useCallback(async (modelId) => {
    try {
      await apiSetModel(modelId)
      setSelectedModelState(modelId)
      localStorage.setItem('nykaa_model', modelId)
      toast.success('Model updated.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update model.')
    }
  }, [])

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    try {
      const data = await apiGetSuggestions()
      setSuggestions(data.suggestions || [])
    } catch {
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  const refreshSessions = useCallback(async () => {
    try {
      const d = await apiGetChatSessions()
      setChatSessions(d.sessions || [])
    } catch {}
  }, [])

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await apiDeleteSession(sessionId)
      setChatSessions(prev => prev.filter(s => s.id !== sessionId))
      // If the deleted session was being viewed, clear the messages
      setCurrentSessionId(prev => {
        if (prev === sessionId) {
          setMessages([])
          return null
        }
        return prev
      })
      toast.success('Session deleted.')
    } catch {
      toast.error('Could not delete session.')
    }
  }, [])

  const loadSession = useCallback(async (session) => {
    try {
      const data = await apiGetSessionMessages(session.id)
      const msgs = (data.messages || []).map((m, i) => ({ ...m, id: i + 1 }))
      setMessages(msgs)
      toast.success(`Restored session · ${session.dataset_name}`)
    } catch {
      toast.error('Could not load session.')
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try { await apiLogout() } catch {}
    onLogout()
  }, [onLogout])

  const resetToHome = useCallback(() => {
    setDbReady(false)
    setDatasetInfo(null)
    setSchemaText('')
    setMessages([])
    setCurrentSessionId(null)
    setSuggestions([])
  }, [])

  const loadDefaultDataset = useCallback(async () => {
    setLoading(true)
    setLoadingStep('Loading Nykaa dataset…')
    try {
      const data = await apiLoadDefault()
      setDatasetInfo(data)
      setCurrentSessionId(data.session_id || null)
      setDbReady(true)
      setMessages([])
      toast.success(`✅ Nykaa dataset loaded · ${data.rows.toLocaleString()} campaigns`)
      fetchSuggestions()
      refreshSessions()
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load dataset.')
      return false
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }, [fetchSuggestions])

  const uploadDataset = useCallback(async (file) => {
    setLoading(true)
    setLoadingStep(`Uploading ${file.name}…`)
    try {
      const data = await apiUploadCsv(file)
      setDatasetInfo(data)
      setCurrentSessionId(data.session_id || null)
      setDbReady(true)
      setMessages([])
      toast.success(`✅ ${file.name} loaded · ${data.rows.toLocaleString()} rows`)
      fetchSuggestions()
      refreshSessions()
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload file.')
      return false
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }, [fetchSuggestions])

  const fetchSchema = useCallback(async () => {
    try {
      const data = await apiGetSchema()
      setSchemaText(data.schema)
      return data.schema
    } catch {
      return ''
    }
  }, [])

  const LOADING_STEPS = [
    'Analysing your question…',
    'Generating SQL with Gemini…',
    'Querying the database…',
    'Selecting best chart type…',
    'Rendering visualisation…',
  ]

  const sendQuery = useCallback(async (question) => {
    if (!question.trim() || loading) return

    // Add user bubble immediately
    const userMsg = { id: Date.now(), role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Cycle loading step labels for UX
    let stepIdx = 0
    setLoadingStep(LOADING_STEPS[0])
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, LOADING_STEPS.length - 1)
      setLoadingStep(LOADING_STEPS[stepIdx])
    }, 2200)

    try {
      const result = await apiRunQuery(question, currentSessionId)
      clearInterval(stepTimer)

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        ...result,
      }
      setMessages(prev => [...prev, assistantMsg])
      // Refresh session list so message_count updates in sidebar
      refreshSessions()
    } catch (err) {
      clearInterval(stepTimer)
      const detail = err.response?.data?.detail || err.message || 'Request failed.'
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', type: 'error', message: detail },
      ])
      toast.error('Query failed.')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }, [loading, currentSessionId, refreshSessions])

  const clearChat = useCallback(async () => {
    try {
      await apiClearHistory()
    } catch { /* ignore */ }
    setMessages([])
    toast.success('Chat cleared.')
  }, [])

  return (
    <AppContext.Provider value={{
      // user
      user,
      handleLogout,
      // state
      dbReady, datasetInfo, schemaText,
      availableModels, selectedModel,
      suggestions, suggestionsLoading,
      chatSessions, currentSessionId,
      messages, loading, loadingStep,
      sidebarOpen,
      // actions
      selectModel,
      fetchSuggestions,
      refreshSessions,
      loadSession,
      deleteSession,
      loadDefaultDataset,
      uploadDataset,
      fetchSchema,
      sendQuery,
      clearChat,
      setSidebarOpen,      resetToHome,    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
