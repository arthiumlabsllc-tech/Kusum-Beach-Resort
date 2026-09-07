// =============================================
// OFFLINE-FIRST DATA SYNC - IndexedDB
// =============================================

const DB_NAME = 'KusumBeachDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingSync';

interface PendingAction {
  id?: number;
  action: string;
  data: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
}

class OfflineSync {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async queueAction(action: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const item: PendingAction = {
        action,
        data,
        timestamp: new Date().toISOString(),
        status: 'pending',
      };
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(): Promise<PendingAction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeAction(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async syncPendingActions(apiCall: (action: string, data: any) => Promise<boolean>): Promise<number> {
    const pending = await this.getPendingActions();
    let synced = 0;

    for (const item of pending) {
      try {
        const success = await apiCall(item.action, item.data);
        if (success && item.id) {
          await this.removeAction(item.id);
          synced++;
        }
      } catch (error) {
        console.error('Sync failed for action:', item.action, error);
      }
    }

    return synced;
  }

  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingActions();
    return pending.length;
  }
}

export const offlineSync = new OfflineSync();

// Online/Offline detection
export const isOnline = (): boolean => navigator.onLine;

export const onOnlineStatusChange = (callback: (online: boolean) => void): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Auto-sync setup
export const setupAutoSync = (apiCall: (action: string, data: any) => Promise<boolean>, intervalMs = 30000) => {
  const syncWhenOnline = async () => {
    if (navigator.onLine) {
      const count = await offlineSync.syncPendingActions(apiCall);
      if (count > 0) {
        console.log(`Synced ${count} pending actions`);
      }
    }
  };

  // Sync on going online
  window.addEventListener('online', syncWhenOnline);

  // Periodic sync
  const intervalId = setInterval(syncWhenOnline, intervalMs);

  return () => {
    window.removeEventListener('online', syncWhenOnline);
    clearInterval(intervalId);
  };
};

// Initialize on module load
offlineSync.init().catch(console.error);
