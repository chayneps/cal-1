// lib/storage.js - Storage helper for Chrome Extension local storage
export const Storage = {
  async get(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return await chrome.storage.local.get(keys);
    }
    // Fallback for direct browser testing
    const result = {};
    const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys || {}));
    for (const key of keyList) {
      const item = localStorage.getItem(`darkcal_${key}`);
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
    for (const [key, val] of Object.entries(items)) {
      localStorage.setItem(`darkcal_${key}`, JSON.stringify(val));
    }
  },

  async remove(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return await chrome.storage.local.remove(keys);
    }
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      localStorage.removeItem(`darkcal_${k}`);
    }
  }
};
