import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1A1D27',
          color: '#E8E8E8',
          border: '1px solid #2D3043',
          borderRadius: '12px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
        },
        success: {
          iconTheme: { primary: '#FC2779', secondary: '#1A1D27' },
          duration: 3000,
        },
        error: {
          iconTheme: { primary: '#FF6B6B', secondary: '#1A1D27' },
          duration: 5000,
        },
      }}
    />
  </React.StrictMode>
)
