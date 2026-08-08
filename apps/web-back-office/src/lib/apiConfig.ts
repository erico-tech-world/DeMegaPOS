import axios from 'axios';

/**
 * Dynamic API and WebSocket URL Configurator
 * 
 * Dynamically resolves API_URL and WS_URL for localhost and cloud deployment platforms (Netlify, Render, Railway, AWS, Custom Domains).
 * Priorities:
 * 1. Environment Variables (`import.meta.env.VITE_API_URL`, `import.meta.env.VITE_WS_URL`)
 * 2. Window Origin resolution (in browser cloud deployments e.g., Netlify / Custom Domain)
 * 3. Localhost fallback (`http://localhost:3000`, `ws://localhost:3000/ws`)
 */

export const getApiUrl = (): string => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Production deployment on Netlify or custom domain
            // e.g., if app is at https://pos.mydomain.com, backend API is at https://api.mydomain.com or relative
            if (hostname.startsWith('app.') || hostname.startsWith('pos.')) {
                const apiHost = hostname.replace(/^(app|pos)\./, 'api.');
                return `${protocol}//${apiHost}`;
            }
            return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
        }
    }
    return 'http://localhost:3000';
};

export const getWsUrl = (): string => {
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }
    if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
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
            // Clear any per-user theme keys (preserve pattern)
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
