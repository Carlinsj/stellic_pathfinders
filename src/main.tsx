import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { CampusFitProvider } from './data/CampusFitContext';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CampusFitProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CampusFitProvider>
    </QueryClientProvider>
  </StrictMode>
);
