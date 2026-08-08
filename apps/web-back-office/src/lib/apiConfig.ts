import axios from 'axios';

/**
 * Dynamic API and WebSocket URL Configurator
 * 
 * Dynamically resolves API_URL and WS_URL for localhost and cloud deployment platforms (Netlify, Render, Railway, AWS, Custom Domains).
 * Priorities:
 * 1. Environment Variables (`import.meta.env.VITE_API_URL`, `import.meta.env.VITE_WS_URL`)
 * 2. Runtime override (`localStorage.getItem('demega_api_url')` or `window.DEMEGA_API_URL`)
 * 3. Static host check (.netlify.app, .vercel.app, etc.) -> Default live backend API endpoint
 * 4. Custom Subdomains (app.mydomain.com -> api.mydomain.com)
 * 5. Localhost fallback (`http://localhost:3000`, `ws://localhost:3000/ws`)
 */

export const getApiUrl = (): string => {
    // 1. Explicit Vite Environment Variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    
    if (typeof window !== 'undefined') {
        // 2. Runtime LocalStorage / Window override
        const customUrl = localStorage.getItem('demega_api_url') || (window as any).DEMEGA_API_URL;
        if (customUrl) return customUrl;

        const { protocol, hostname, port } = window.location;

        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // 3. Static frontend hosts check: Netlify, Vercel, Cloudflare Pages, GitHub Pages
            // Static web servers do NOT run Node/Fastify API servers, so returning window.location.origin causes HTTP 404
            const isStaticHost = hostname.endsWith('.netlify.app') || 
                                 hostname.endsWith('.vercel.app') || 
                                 hostname.endsWith('.pages.dev') || 
                                 hostname.endsWith('.github.io');
            
            if (isStaticHost) {
                // If VITE_API_URL is missing in Netlify dashboard, use default backend API server URL or window override
                return (window as any).DEMEGA_BACKEND_URL || 'https://demegapos-backend.onrender.com';
            }

            // 4. Custom domain subdomains (e.g., app.demegapos.com -> api.demegapos.com)
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
            const isStaticHost = hostname.endsWith('.netlify.app') || 
                                 hostname.endsWith('.vercel.app') || 
                                 hostname.endsWith('.pages.dev') || 
                                 hostname.endsWith('.github.io');

            if (isStaticHost) {
                return (window as any).DEMEGA_WS_BACKEND_URL || 'wss://demegapos-backend.onrender.com/ws';
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
