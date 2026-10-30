/**
 * DeMegaPOS PM2 Ecosystem Configuration
 * 
 * Provides headless daemonization and process management for DeMegaPOS services.
 * Allows running backend API, web portals, and auxiliary database tools (Prisma Studio)
 * continuously in the background without keeping terminal windows open.
 *
 * Usage:
 *   - Start all services: pm2 start ecosystem.config.cjs
 *   - Start backend only:  pm2 start ecosystem.config.cjs --only demegapos-backend
 *   - Start DB Studio GUI: pm2 start ecosystem.config.cjs --only prisma-studio
 *   - Save active list:    pm2 save
 *   - Setup OS auto-boot:  pm2 startup
 *   - View status / logs:  pm2 status | pm2 logs
 *   - Stop all services:   pm2 stop ecosystem.config.cjs
 */

module.exports = {
  apps: [
    {
      name: 'demegapos-backend',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'apps/backend/src/index.ts',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'demegapos-web-back-office',
      script: 'node_modules/vite/bin/vite.js',
      args: '--port 5173 --host',
      cwd: './apps/web-back-office',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5173,
      },
      error_file: './logs/web-back-office-error.log',
      out_file: './logs/web-back-office-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'prisma-studio',
      script: 'node_modules/prisma/build/index.js',
      args: 'studio --schema=packages/db/prisma/schema.prisma --port=5555 --browser=none',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        PORT: 5555,
      },
      error_file: './logs/studio-error.log',
      out_file: './logs/studio-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
