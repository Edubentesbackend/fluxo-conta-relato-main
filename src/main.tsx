import { createRoot } from 'react-dom/client'
import { ThemeProvider } from "next-themes"
import App from './App.tsx'
import './index.css'

// Offline caching is disabled until financial-data consistency has an
// explicit strategy. Clear previously installed workers and their caches.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => console.log('SW unregister failed: ', error))

    if ('caches' in window) {
      caches.keys()
        .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
        .catch((error) => console.log('Cache cleanup failed: ', error))
    }
  })
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider 
    attribute="class" 
    defaultTheme="system" 
    enableSystem 
    disableTransitionOnChange
  >
    <App />
  </ThemeProvider>
);
