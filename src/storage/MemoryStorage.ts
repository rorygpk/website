import { IStorageProvider } from './IStorageProvider';

// Zero-dependency memory fallback (ephemeral per worker isolate)
export class MemoryStorage implements IStorageProvider {
  private store = new Map<string, { value: any; expiry: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
        this.store.delete(key);
        return null;
    }
    return item.value as T;
  }

  async put<T>(key: string, value: T, expirationTtl?: number): Promise<void> {
    const expiry = expirationTtl ? Date.now() + expirationTtl * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
