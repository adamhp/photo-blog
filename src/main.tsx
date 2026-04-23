import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="p-8 font-sans">
      <p className="font-mono text-sm text-ash">Bootstrapping…</p>
    </div>
  </StrictMode>,
);
