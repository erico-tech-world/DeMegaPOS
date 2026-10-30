const fs = require('fs');
const path = require('path');

function syncDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            syncDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

try {
    const rootPnpmPrisma = path.resolve(__dirname, '../../node_modules/.pnpm/@prisma+client@6.2.1_prisma@6.2.1/node_modules/.prisma/client');
    const localNodeModulesPrisma = path.resolve(__dirname, 'node_modules/.prisma/client');
    const rootNodeModulesPrisma = path.resolve(__dirname, '../../node_modules/.prisma/client');
    
    syncDir(rootPnpmPrisma, localNodeModulesPrisma);
    syncDir(rootPnpmPrisma, rootNodeModulesPrisma);
    console.log('[sync-client] Prisma client types synced to all node_modules locations.');
} catch (e) {
    console.warn('[sync-client] Note:', e.message);
}
