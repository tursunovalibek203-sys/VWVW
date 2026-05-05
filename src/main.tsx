// Polyfill for Buffer in browser (only for modules that need it)
import { Buffer } from 'buffer'
(window as any).Buffer = Buffer

// React imports
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LanguageProvider } from './contexts/LanguageContext'
import './styles/professional-design.css'
import './index.css'

// Unregister any existing service workers to prevent fetch errors
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister()
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
)
