import React from 'react'
import ReactDOM from 'react-dom/client'
import MahjongTracker from './App'
import Demo from './Demo'

const isDemo = window.location.pathname === '/demo';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isDemo ? <Demo /> : <MahjongTracker />}
  </React.StrictMode>,
)
