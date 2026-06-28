import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FontSettingsProvider } from './contexts/FontSettingsContext.tsx'
import { FavoritesProvider } from './contexts/FavoritesContext.tsx'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <FontSettingsProvider>
        <FavoritesProvider>
          <App />
        </FavoritesProvider>
      </FontSettingsProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service worker registration failed', error)
    })
  })
}
