/** Returns true when running inside the Tauri native app (not a browser tab). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Open a URL in the user's default browser (works in both Tauri and browser). */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Open the always-on-top native notification popup window. */
export async function showNotificationWindow(
  eventType: string,
  title: string,
  body: string,
  promptText: string,
  dismissSeconds: number,
  autoClose?: boolean,
  sessionNumber?: number,
  promptCountTotal?: number,
): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('show_notification', {
    eventType,
    title,
    body,
    promptText,
    dismissSeconds,
    autoClose: autoClose ?? false,
    sessionNumber: sessionNumber ?? 0,
    promptCountTotal: promptCountTotal ?? null,
  });
}

/**
 * Listen for the notification popup being dismissed.
 * Returns an unsubscribe function — call it on component unmount.
 */
export async function onNotificationDismissed(
  callback: (eventType: string) => void,
): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<{ eventType: string }>('notification-dismissed', (event) => {
    callback(event.payload.eventType);
  });
  return unlisten;
}
