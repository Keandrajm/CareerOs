const STORAGE_KEY = 'careeros_access_key';

export function getAccessKey() {
  return window.localStorage.getItem(STORAGE_KEY) || '';
}

export function setAccessKey(value) {
  const trimmed = String(value || '').trim();
  if (trimmed) {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearAccessKey() {
  window.localStorage.removeItem(STORAGE_KEY);
}
