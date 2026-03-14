import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { runStorageMigration } from './services/storageAdapter.js'

// Ejecutar migración de storage ANTES del primer render.
// Limpia claves legacy y resetea datos si la versión semilla subió.
runStorageMigration();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
