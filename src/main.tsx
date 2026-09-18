import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/fraunces/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './theme/tokens.css';
import './theme/global.css';
import './theme/components.css';
import { App } from './App';
import { AppStateProvider } from './components/AppStateProvider';
import { LangProvider } from './i18n/LangProvider';

const el = document.getElementById('root');
if (!el) throw new Error('Root element #root not found');

createRoot(el).render(
  <StrictMode>
    <LangProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </LangProvider>
  </StrictMode>,
);
