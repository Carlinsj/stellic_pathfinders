import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CampusFitProvider } from './data/CampusFitContext';
import './tokens.css';
import './styles.css';
import './premium.css';

const clearStaleDevelopmentPwa = async (): Promise<void> => {
  if (!import.meta.env.DEV) return;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in globalThis) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => /workbox|campusfit/i.test(name))
      .map((name) => caches.delete(name)));
  }
};

void clearStaleDevelopmentPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CampusFitProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </CampusFitProvider>
  </StrictMode>
);
