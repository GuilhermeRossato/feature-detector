import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  /**
   * Local storage saves data and persists it even if the user closes the browser an opens it again
   */
  constructor() { }

  /**
   * Gets a cached object if it exists and has not expired OR generate it with a generator function
   * @param generator A function that generates the string to be saved
   * @param key The key that identifies the string to your application
   * @param expirationHours How many hours does the string stays in cache before being removed, zero to always remove
   */
  async generateOrCache(generator: () => string | Promise<string>, key: string, expirationHours = 24) {
    const savedData = this.getItem(key);
    if (savedData && expirationHours > 0) {
      return savedData;
    }
    let newData = generator();
    if (newData instanceof Promise) {
      newData = await newData;
    }
    if (typeof newData !== 'string') {
      throw new Error('Generator function must return a string to be saved internally, got ' + typeof newData);
    }
    if (expirationHours <= 0) {
      this.clearItem(key);
    } else {
      this.setItem(key, newData, expirationHours);
    }
    return newData;
  }

  /**
   * Same as generateOrCache, but doesn't allow promises in the generator function and therefore is syncronous
   * @param generator A function that generates the string to be saved
   * @param key The key that identifies the string to your application
   * @param expirationHours How many hours does the string stays in cache before being removed
   */
  generateOrCacheSync(generator: () => string, key: string, expirationHours = 24) {
    const savedData = this.getItem(key);
    if (savedData) {
      return savedData;
    }
    const newData = generator();
    if (typeof newData !== 'string') {
      throw new Error('Generator function must return a string to be saved internally, got ' + typeof newData);
    }
    this.setItem(key, newData, expirationHours);
    return newData;
  }

  /**
   * Retrieves a locally stored item by its key (or null if it doesn't exist) unless it has expired
   * if an object is detected as expired, it gets deleted from the cache
   * @param key The unique identifier of the cached item
   */
  getItem(key: string): string {
    const data = window.localStorage.getItem(key);
    if (data === null || data === undefined) {
      return null;
    }
    const expirationDateStr = window.localStorage.getItem(key + '-expdate');
    if (typeof expirationDateStr !== 'string') {
      return data;
    }
    const expirationDateTime = parseInt(expirationDateStr, 10);
    if (isNaN(expirationDateTime)) {
      return null;
    }
    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setTime(expirationDateTime);
    if (expirationDate < now) {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(key + '-expdate');
      return null;
    }
    return data;
  }

  /**
   * Saves data to LocalStorage optionally giving it an expiration date in terms of hours before invalidation.
   * @param key The unique identifier of the cached item
   * @param data The data, in a string, containing the information to be saved locally
   * @param expirationHours How many hours before invalidating the cache (null for never), default 24 hours
   */
  setItem(key: string, data: string, expirationHours: number | void = 24): void {
    if (expirationHours === null || expirationHours === undefined) {
      window.localStorage.setItem(key, data);
      return;
    }
    if (!expirationHours || isNaN(expirationHours) || expirationHours <= 0) {
      window.localStorage.removeItem(key);
      return;
    }
    const d = new Date();
    d.setTime(d.getTime() + expirationHours * 1000 * 60 * 60);
    const timeString = d.getTime().toString();
    window.localStorage.setItem(key + '-expdate', timeString);
    window.localStorage.setItem(key, data);
  }

  removeItem(key: string) {
    window.localStorage.removeItem(key + '-expdate');
    return window.localStorage.removeItem(key);
  }

  /**
   * Alias for removeItem
   */
  clearItem(key: string) {
    return this.removeItem(key);
  }
}
