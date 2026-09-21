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
import { installChunkReloadInBrowser } from './lib/chunkReload';

// CHANGED (S3-bdd2): a tab left open across a deploy asks for chunk files that no longer exist —
// recover with one reload instead of showing "This chart failed to load".
installChunkReloadInBrowser();

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
