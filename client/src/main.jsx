import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './reviews-clone.css'
import './contact-clone.css'
import './pricing-cards.css'
import './comparison-cards.css'
import './section-blend.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
