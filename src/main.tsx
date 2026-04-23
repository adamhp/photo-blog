import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: 32, fontFamily: 'system-ui' }}>
      <p>Bootstrapping…</p>
    </div>
  </StrictMode>,
);
