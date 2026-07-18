export interface IStorageProvider {
  get<T>(key: string): Promise<T | null>;
  put<T>(key: string, value: T, expirationTtl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
