import { supabase } from './supabase';

function clearStorage(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;

    if (
      key.startsWith('sb-') ||
      key.startsWith('immersion') ||
      key.includes('supabase')
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export async function clearAppCacheAndReload() {
  await supabase.auth.signOut().catch(() => undefined);
  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);

  if ('caches' in window) {
    const cacheNames = await window.caches.keys().catch(() => []);
    await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  window.location.replace('/login');
}
