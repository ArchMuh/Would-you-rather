import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'wyr:';

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: non-fatal
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // non-fatal
  }
}

export async function clearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX)));
  } catch {
    // non-fatal
  }
}
