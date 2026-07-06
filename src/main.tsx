import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// 自动检测部署子路径（如 /invest-app/），用于 BrowserRouter basename
const basename = '/' + (window.location.pathname.split('/').filter(Boolean).shift() || '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
