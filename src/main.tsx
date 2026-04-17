import { Suspense, StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// eslint-disable-next-line react-refresh/only-export-components
const App = lazy(() => import('./App.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="p-4 text-sm text-slate-200">Carregando editor...</div>}>
      <App />
    </Suspense>
  </StrictMode>,
)
