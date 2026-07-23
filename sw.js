/* eslint-disable no-restricted-globals */

const PREVIEW_SCOPE = '/preview/';

// ----------------------------------------------------------------------
// 1. Error Overlay
// ----------------------------------------------------------------------
const generateErrorOverlay = (message, sourcePath) => {
    return `(function() {
        console.error("[Runtime Preview Error] " + ${JSON.stringify(message)});
        let overlay = document.getElementById('gbrain-error-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gbrain-error-overlay';
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
                backgroundColor: 'rgba(0, 0, 0, 0.85)', color: '#ff5555',
                zIndex: '99999', padding: '20px', overflow: 'auto',
                fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'pre-wrap'
            });
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '<h3 style="color: #ff5555; border-bottom: 1px solid #ff5555; padding-bottom: 10px;">Preview Error</h3>' +
            '<div style="color: #ccc; margin-bottom: 10px;">File: <strong>' + ${JSON.stringify(sourcePath)} + '</strong></div>' +
            '<div>' + ${JSON.stringify(message).replace(/</g, '&lt;')} + '</div>';
    })();`;
};

// ----------------------------------------------------------------------
// 2. Communication Logic
// ----------------------------------------------------------------------
const pendingRequests = new Map();

const fetchFileFromMainThread = (path) => {
    return new Promise((resolve, reject) => {
        const id = (typeof crypto.randomUUID === 'function') 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2) + Date.now().toString(36);

        pendingRequests.set(id, { resolve, reject });

        self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
            if (clients && clients.length) {
                clients[0].postMessage({ type: 'SW_REQUEST_FILE', path, requestId: id });
                setTimeout(() => {
                    if (pendingRequests.has(id)) {
                        pendingRequests.get(id).reject(new Error(`Timeout awaiting file: ${path}`));
                        pendingRequests.delete(id);
                    }
                }, 5000);
            } else {
                reject(new Error('No active window clients found'));
            }
        });
    });
};

self.addEventListener('message', (event) => {
    const { type, requestId, content, path, found, error } = event.data;
    if (type === 'SW_RESPONSE_FILE' && pendingRequests.has(requestId)) {
        const { resolve, reject } = pendingRequests.get(requestId);
        if (found) resolve({ content, path });
        else reject(new Error(error || 'File not found'));
        pendingRequests.delete(requestId);
    }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// ----------------------------------------------------------------------
// 3. MIME Type & File Extension Resolver
// ----------------------------------------------------------------------
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.jsx': 'application/javascript',
    '.ts': 'application/javascript',
    '.tsx': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const getContentType = (filename) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return mimeTypes[ext] || 'text/plain';
};

// ----------------------------------------------------------------------
// 4. Interceptor
// ----------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (!url.pathname.startsWith(PREVIEW_SCOPE)) return;

    // A. Main HTML Endpoint (Root / preview/ or /preview/index.html)
    if (url.pathname === PREVIEW_SCOPE || url.pathname === PREVIEW_SCOPE + 'index.html') {
        event.respondWith(async function() {
            try {
                // Request the entry point of our virtual file system (via __ENTRY_POINT__)
                const { content } = await fetchFileFromMainThread('/__ENTRY_POINT__');
                return new Response(content, { headers: { 'Content-Type': 'text/html' } });
            } catch (err) {
                // Return a graceful error screen if the index.html or set entry point doesn't exist
                const errorHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Error</title></head>
                <body style="background: #0f172a; color: #f1f5f9; font-family: sans-serif; padding: 40px; text-align: center;">
                    <div style="max-width: 500px; margin: auto; background: #1e293b; padding: 30px; border-radius: 8px; border: 1px solid #334155;">
                        <h2 style="color: #f43f5e; margin-top: 0;">Preview Unavailable</h2>
                        <p style="color: #94a3b8; font-size: 14px;">The application entry point (${err.message}) could not be resolved from the virtual filesystem.</p>
                        <p style="color: #64748b; font-size: 12px; font-family: monospace;">Make sure '/index.html' exists in your filesystem, or select a file and click 'Play' to set it as entry point.</p>
                    </div>
                </body></html>`;
                return new Response(errorHtml, { headers: { 'Content-Type': 'text/html' } });
            }
        }());
        return;
    }

    // B. Other Static Resources Process
    const vfsPath = url.pathname.replace(PREVIEW_SCOPE, '/').replace('//', '/');

    event.respondWith(async function() {
        try {
            const { content: rawContent, path: resolvedPath } = await fetchFileFromMainThread(vfsPath);
            const contentType = getContentType(resolvedPath);

            return new Response(rawContent, { 
                headers: { 'Content-Type': contentType } 
            });
        } catch (err) {
            const errorScript = generateErrorOverlay(`Failed to load resource: ${vfsPath} (${err.message})`, vfsPath);
            // If it's a CSS file or JS file, returning is safe
            const contentType = getContentType(vfsPath);
            if (contentType === 'application/javascript') {
                return new Response(errorScript, { headers: { 'Content-Type': 'application/javascript' } });
            }
            return new Response(err.message, { status: 404, headers: { 'Content-Type': 'text/plain' } });
        }
    }());
});
