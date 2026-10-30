import './polyfills.web';

if (typeof window !== 'undefined') {
    console.log("Entry point index.ts reached!");

    // Create a diagnostic overlay that stays hidden unless an error occurs or we force it
    const diagnosticDiv = document.createElement('div');
    diagnosticDiv.id = 'pos-diagnostic';
    diagnosticDiv.style.position = 'fixed';
    diagnosticDiv.style.top = '0';
    diagnosticDiv.style.left = '0';
    diagnosticDiv.style.width = '100%';
    diagnosticDiv.style.height = '100%';
    diagnosticDiv.style.backgroundColor = '#fff';
    diagnosticDiv.style.zIndex = '9999';
    diagnosticDiv.style.padding = '20px';
    diagnosticDiv.style.fontFamily = 'monospace';
    diagnosticDiv.style.display = 'none'; // Hidden by default
    diagnosticDiv.innerHTML = '<h1>DeMegaPOS Diagnostic</h1><div id="diag-content">Initializing...</div>';
    document.body.appendChild(diagnosticDiv);

    window.onerror = function (message, source, lineno, colno, error) {
        diagnosticDiv.style.display = 'block';
        const content = document.getElementById('diag-content');
        if (content) {
            content.innerHTML += `<div style="color: red; margin: 10px 0;">
                <strong>Global Error:</strong> ${message}<br/>
                <small>at ${source}:${lineno}:${colno}</small>
            </div>`;
        }
        return false;
    };

    window.onunhandledrejection = function (event) {
        diagnosticDiv.style.display = 'block';
        const content = document.getElementById('diag-content');
        if (content) {
            content.innerHTML += `<div style="color: orange; margin: 10px 0;">
                <strong>Unhandled Promise Rejection:</strong> ${event.reason}
            </div>`;
        }
    };
}

import { registerRootComponent } from 'expo';
import App from './App';

try {
    registerRootComponent(App);
    console.log("registerRootComponent called successfully");
} catch (e) {
    console.error("Failed to register root component", e);
    if (typeof document !== 'undefined') {
        const diag = document.getElementById('pos-diagnostic');
        if (diag) {
            diag.style.display = 'block';
            const content = document.getElementById('diag-content');
            if (content) content.innerHTML += `<div style="color: red">Boot Exception: ${e}</div>`;
        }
    }
}
