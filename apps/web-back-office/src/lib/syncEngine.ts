import { offlineEngine } from './offlineStorage';
import axios from 'axios';
import { API_URL } from './apiConfig';

export type NetworkStatus = 'ONLINE MODE (SYNCED)' | 'OFFLINE MODE (LOCAL DRIVE ACTIVE)';

export class SyncEngine {
    private isOnlineStatus: boolean = navigator.onLine;
    private listeners: ((status: NetworkStatus) => void)[] = [];
    private isSyncing: boolean = false;

    constructor() {
        window.addEventListener('online', () => this.handleStatusChange(true));
        window.addEventListener('offline', () => this.handleStatusChange(false));
    }

    public get currentStatus(): NetworkStatus {
        return this.isOnlineStatus ? 'ONLINE MODE (SYNCED)' : 'OFFLINE MODE (LOCAL DRIVE ACTIVE)';
    }

    public subscribe(listener: (status: NetworkStatus) => void) {
        this.listeners.push(listener);
        listener(this.currentStatus);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private async handleStatusChange(online: boolean) {
        this.isOnlineStatus = online;
        const status = this.currentStatus;
        this.listeners.forEach(l => l(status));

        if (online) {
            console.log('[SYNC ENGINE] Internet connection restored. Triggering background sync...');
            await this.triggerSync();
        } else {
            console.warn('[SYNC ENGINE] Network disconnected. Switched to Local Hardware Drive persistence.');
        }
    }

    public async triggerSync(): Promise<{ syncedCount: number; errors: number }> {
        if (this.isSyncing) return { syncedCount: 0, errors: 0 };
        this.isSyncing = true;
        let syncedCount = 0;
        let errors = 0;

        try {
            const queue = await offlineEngine.getSyncQueue();
            if (queue.length === 0) {
                console.log('[SYNC ENGINE] Sync queue is empty.');
                return { syncedCount: 0, errors: 0 };
            }

            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            for (const item of queue) {
                try {
                    if (item.type === 'ORDER_CREATE') {
                        await axios.post(`${API_URL}/orders`, item.payload, { headers });
                        await offlineEngine.removeSyncItem(item.id);
                        syncedCount++;
                    }
                } catch (err) {
                    console.error('[SYNC ENGINE] Failed to sync item:', item.id, err);
                    errors++;
                }
            }
        } finally {
            this.isSyncing = false;
        }

        return { syncedCount, errors };
    }
}

export const syncEngine = new SyncEngine();
