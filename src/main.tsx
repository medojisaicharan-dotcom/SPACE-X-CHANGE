import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { DbSyncWatcher } from '@/components/DbSyncWatcher';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { initDb } from '@/lib/demoDb';
import { IS_SUPABASE_MODE } from '@/lib/config';
import '@/index.css';

async function bootstrap() {
  const container = document.getElementById('root');
  if (!container) throw new Error('Root element not found');

  try {
    await initDb();
  } catch (error) {
    console.error('Could not initialise the application database', error);
    const heading = IS_SUPABASE_MODE ? 'Supabase unavailable' : 'Storage unavailable';
    const body = IS_SUPABASE_MODE
      ? 'SPACEXCHANGE could not reach Supabase. Check your internet connection, confirm VITE_SUPABASE_URL and the publishable key in .env.local, then reload this page.'
      : 'SPACEXCHANGE could not open its local demo database. Enable browser storage (localStorage) or try a different browser, then reload this page.';
    container.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:24px;font-family:system-ui,sans-serif;">
        <div style="max-width:480px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;padding:28px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${heading}</h1>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
            ${body}
          </p>
        </div>
      </div>`;
    return;
  }

  createRoot(container).render(
    <StrictMode>
      <ToastProvider>
        <DbSyncWatcher />
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </StrictMode>,
  );
}

void bootstrap();
