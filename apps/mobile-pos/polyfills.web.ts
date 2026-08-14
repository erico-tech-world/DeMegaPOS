// Polyfills for React Native Web
if (typeof window !== 'undefined') {
    window.global = window.global || window;
    // @ts-ignore
    window.process = window.process || { env: {} };

    if (!window.process.env) {
        window.process.env = {};
    }
}
