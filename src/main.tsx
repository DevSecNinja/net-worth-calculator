import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import '@/styles/global.css';

const root = document.querySelector('#root');
if (!root) throw new Error('Application root is missing.');

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
