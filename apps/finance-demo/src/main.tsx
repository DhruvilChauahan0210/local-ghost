import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WebGPUAIProvider } from '@dhruvil0210/local-ghost';
import { AppProvider } from './context/AppContext';
import './index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <WebGPUAIProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </WebGPUAIProvider>
  </StrictMode>
);
