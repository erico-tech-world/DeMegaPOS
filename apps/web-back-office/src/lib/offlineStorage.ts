// Local-First Enterprise Storage Engine (IndexedDB Native Manager)
const DB_NAME = 'DeMegaPOS_OfflineEngine';
const DB_VERSION = 1;

export interface OfflineOrder {
    id: string;
    items: any[];
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
    cashierId?: string;
    customer?: any;
    synced: boolean;
}

export class OfflineStorageEngine {
    private dbPromise: Promise<IDBDatabase>;

    constructor() {
        this.dbPromise = this.initDB();
    }

    private initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('orders')) {
                    db.createObjectStore('orders', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('products')) {
                    db.createObjectStore('products', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = (err) => reject(err);
        });
    }

    // Save offline order
    async saveOrder(order: OfflineOrder): Promise<void> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['orders', 'syncQueue'], 'readwrite');
            tx.objectStore('orders').put(order);
            tx.objectStore('syncQueue').put({
                id: order.id,
                type: 'ORDER_CREATE',
                payload: order,
                timestamp: new Date().toISOString()
            });
            tx.oncomplete = () => resolve();
            tx.onerror = (err) => reject(err);
        });
    }

    // Get all offline orders
    async getOrders(): Promise<OfflineOrder[]> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('orders', 'readonly');
            const store = tx.objectStore('orders');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (err) => reject(err);
        });
    }

    // Get pending sync queue
    async getSyncQueue(): Promise<any[]> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('syncQueue', 'readonly');
            const req = tx.objectStore('syncQueue').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (err) => reject(err);
        });
    }

    // Clear item from sync queue after successful sync
    async removeSyncItem(id: string): Promise<void> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('syncQueue', 'readwrite');
            tx.objectStore('syncQueue').delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = (err) => reject(err);
        });
    }

    // Cache products for offline availability
    async cacheProducts(products: any[]): Promise<void> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('products', 'readwrite');
            const store = tx.objectStore('products');
            store.clear();
            products.forEach(p => store.put(p));
            tx.oncomplete = () => resolve();
            tx.onerror = (err) => reject(err);
        });
    }

    async getCachedProducts(): Promise<any[]> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('products', 'readonly');
            const req = tx.objectStore('products').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (err) => reject(err);
        });
    }

    // Measure storage consumption
    async getStorageHealth(): Promise<{ usedBytes: number; quotaBytes: number; percentage: number }> {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const usedBytes = estimate.usage || 0;
            const quotaBytes = estimate.quota || 1073741824; // fallback 1GB
            const percentage = Math.min(100, (usedBytes / quotaBytes) * 100);
            return { usedBytes, quotaBytes, percentage };
        }
        return { usedBytes: 45000000, quotaBytes: 53687091200, percentage: 0.1 }; // Mock ~45MB / 50GB
    }

    // Export database snapshot to JSON file for vault storage
    async exportBackup(): Promise<string> {
        const orders = await this.getOrders();
        const products = await this.getCachedProducts();
        const syncQueue = await this.getSyncQueue();

        const backupData = {
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            orders,
            products,
            syncQueue
        };

        return JSON.stringify(backupData, null, 2);
    }

    // Restore database snapshot from JSON
    async restoreBackup(jsonString: string): Promise<void> {
        const data = JSON.parse(jsonString);
        if (data.orders && Array.isArray(data.orders)) {
            for (const order of data.orders) {
                await this.saveOrder(order);
            }
        }
        if (data.products && Array.isArray(data.products)) {
            await this.cacheProducts(data.products);
        }
    }
}

export const offlineEngine = new OfflineStorageEngine();
