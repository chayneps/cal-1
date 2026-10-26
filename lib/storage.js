// lib/storage.js - Storage helper for Chrome Extension local storage
const _memStore = new Map();

export const Storage = {
  async get(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return await chrome.storage.local.get(keys);
    }
    // Fallback for direct browser testing or node environment
    const hasLocalStorage = typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function';
    const result = {};
    const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys || {}));
    for (const key of keyList) {
      let item = null;
      if (hasLocalStorage) {
        item = localStorage.getItem(`darkcal_${key}`);
      } else {
        item = _memStore.has(`darkcal_${key}`) ? _memStore.get(`darkcal_${key}`) : null;
      }

      if (item !== null) {
        try {
          result[key] = JSON.parse(item);
        } catch {
          result[key] = item;
        }
      } else if (typeof keys === 'object' && !Array.isArray(keys) && keys[key] !== undefined) {
        result[key] = keys[key];
      }
    }
    return result;
  },

  async set(items) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return await chrome.storage.local.set(items);
    }
    const hasLocalStorage = typeof localStorage !== 'undefined' && localStorage && typeof localStorage.setItem === 'function';
    for (const [key, val] of Object.entries(items)) {
      const serialized = JSON.stringify(val);
      if (hasLocalStorage) {
        localStorage.setItem(`darkcal_${key}`, serialized);
      } else {
        _memStore.set(`darkcal_${key}`, serialized);
      }
    }
  },

  async remove(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return await chrome.storage.local.remove(keys);
    }
    const hasLocalStorage = typeof localStorage !== 'undefined' && localStorage && typeof localStorage.removeItem === 'function';
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      if (hasLocalStorage) {
        localStorage.removeItem(`darkcal_${k}`);
      } else {
        _memStore.delete(`darkcal_${k}`);
      }
    }
  }
};
