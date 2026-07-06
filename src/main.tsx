import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// 检测部署子路径（如 GitHub Pages 的 /invest-app/）
// 开发环境（localhost）为空，部署环境自动提取第一段路径
const deployPath = window.location.pathname.split('/').filter(Boolean)
const basename = deployPath.length > 0 ? '/' + deployPath[0] : ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
