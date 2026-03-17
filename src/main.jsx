import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initDemoData } from './services/initDemo.js'
import * as storage from './services/storage.js'

// Inicializar datos demo con versionado — si la versión cambió, recarga el dataset completo
initDemoData(storage)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
