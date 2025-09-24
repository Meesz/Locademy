/**
 * @file main.tsx
 * @description React entry point that wires up providers and renders the application.
 * @author Meesz
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { LibraryProvider } from './state/library-context'
import { SettingsProvider } from './state/settings-context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <LibraryProvider>
          <App />
        </LibraryProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
