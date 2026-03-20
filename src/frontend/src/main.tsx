import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { DASHBOARD_AUTO_REFRESH_MS } from './constants/refresh'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep active dashboard data fresh across pages without manual refresh.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: DASHBOARD_AUTO_REFRESH_MS,
      refetchIntervalInBackground: true,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
