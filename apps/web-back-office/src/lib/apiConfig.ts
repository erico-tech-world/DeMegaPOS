import axios from 'axios';

/**
 * Dynamic API and WebSocket URL Configurator
 *
 * Backend is a Fastify/Node.js service hosted on Render (https://demegapos.onrender.com).
 *
 * Resolution priority:
 * 1. VITE_API_URL  env var  — set in apps/web-back-office/.env.production or Vercel dashboard
 * 2. Runtime override       — localStorage 'demega_api_url' or window.DEMEGA_API_URL
 * 3. Custom subdomain       — app.domain.com → api.domain.com (future custom domain use)
 * 4. Localhost fallback     — http://localhost:3000 (local dev only)
 *
 * ⚠️  IMPORTANT FOR PRODUCTION (VERCEL):
 *     Vercel hosts static files only — it cannot run the Node.js Fastify backend.
 *     VITE_API_URL is set in apps/web-back-office/.env.production and is baked
 *     into the build at compile time. You can also override it in:
 *     Vercel Dashboard → Project → Settings → Environment Variables
 *     Example: VITE_API_URL=https://demegapos.onrender.com
 *     After adding the variable, trigger a new Vercel deploy.
 */

export const getApiUrl = (): string => {
    // 1. Explicit Vite Environment Variable (set in Netlify dashboard)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    if (typeof window !== 'undefined') {
        // 2. Runtime LocalStorage / Window override
        const customUrl = localStorage.getItem('demega_api_url') || (window as any).DEMEGA_API_URL;
        if (customUrl) return customUrl;

        const { protocol, hostname, port } = window.location;

        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // 3. Static frontend host detected (Netlify, Vercel, GitHub Pages, Cloudflare Pages)
            // Static hosts cannot run Node.js — VITE_API_URL must be set in Netlify dashboard.
            const isStaticHost =
                hostname.endsWith('.netlify.app') ||
                hostname.endsWith('.vercel.app') ||
                hostname.endsWith('.pages.dev') ||
                hostname.endsWith('.github.io');

            if (isStaticHost) {
                // Allow runtime injection via window global (e.g. set in index.html script tag)
                const windowOverride = (window as any).DEMEGA_BACKEND_URL;
                if (windowOverride) return windowOverride;

                // No env var + no override = misconfiguration.
                // Log a clear error so the developer knows exactly what to fix.
                console.error(
                    '[DeMegaPOS] VITE_API_URL is not configured!\n' +
                    'Option A: Set in apps/web-back-office/.env.production:\n' +
                    '          VITE_API_URL=https://demegapos.onrender.com\n' +
                    'Option B: Go to Vercel Dashboard → Project → Settings → Environment Variables\n' +
                    '          Add: VITE_API_URL = https://demegapos.onrender.com\n' +
                    'Then trigger a new Vercel deploy.'
                );
                // Return empty string so axios requests fail with a clear network error
                // instead of silently hitting the wrong server.
                return '';
            }

            // 4. Custom domain subdomains (e.g., app.demegapos.com → api.demegapos.com)
            if (hostname.startsWith('app.') || hostname.startsWith('pos.')) {
                const apiHost = hostname.replace(/^(app|pos)\./, 'api.');
                return `${protocol}//${apiHost}`;
            }

            // Standard custom domain with co-located or proxied backend
            return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
        }
    }

    // 5. Local development fallback
    return 'http://localhost:3000';
};

export const getWsUrl = (): string => {
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }
    if (typeof window !== 'undefined') {
        const customWs = localStorage.getItem('demega_ws_url') || (window as any).DEMEGA_WS_URL;
        if (customWs) return customWs;

        const { protocol, hostname, port } = window.location;
        const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            const isStaticHost =
                hostname.endsWith('.netlify.app') ||
                hostname.endsWith('.vercel.app') ||
                hostname.endsWith('.pages.dev') ||
                hostname.endsWith('.github.io');

            if (isStaticHost) {
                const windowOverride = (window as any).DEMEGA_WS_BACKEND_URL;
                if (windowOverride) return windowOverride;
                // Derive WS URL from the API URL
                const apiBase = getApiUrl();
                if (apiBase) return apiBase.replace(/^http/, 'ws') + '/ws';
                return '';
            }

            if (hostname.startsWith('app.') || hostname.startsWith('pos.')) {
                const apiHost = hostname.replace(/^(app|pos)\./, 'api.');
                return `${wsProtocol}//${apiHost}/ws`;
            }
            return `${wsProtocol}//${hostname}${port ? `:${port}` : ''}/ws`;
        }
    }
    return 'ws://localhost:3000/ws';
};

export const API_URL = getApiUrl();
export const WS_URL = getWsUrl();

// ─── Global Axios 403 Interceptor ─────────────────────────────────────────────
// When the backend returns HTTP 403 (access revoked / account terminated/suspended),
// immediately clear all session tokens and redirect to the login page.

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error?.response?.status === 403 &&
            error?.response?.data?.message?.includes('Access Revoked')
        ) {
            // Clear all auth tokens from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('demega_user');
            // Clear any per-user theme keys
            Object.keys(localStorage)
                .filter((k) => k.startsWith('demega_theme_'))
                .forEach((k) => localStorage.removeItem(k));

            console.warn('[SECURITY] 403 Access Revoked — session cleared, redirecting to login.');

            // Force redirect — use window.location to bypass React Router
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
                window.location.href = '/auth/login?revoked=1';
            }
        }
        return Promise.reject(error);
    }
);
