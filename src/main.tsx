import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ClinicApp } from './ClinicApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClinicApp />
  </StrictMode>,
)
