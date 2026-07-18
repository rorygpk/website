import { IStorageProvider } from './IStorageProvider';

export class KVStorage implements IStorageProvider {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.kv.get(key, 'json');
    return data as T | null;
  }

  async put<T>(key: string, value: T, expirationTtl?: number): Promise<void> {
    if (expirationTtl && expirationTtl >= 60) {
      // KV minimum TTL is 60 seconds
      await this.kv.put(key, JSON.stringify(value), { expirationTtl });
    } else {
      await this.kv.put(key, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}
