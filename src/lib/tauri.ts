/** Returns true when running inside the Tauri native app (not a browser tab). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Open the always-on-top native notification popup window. */
export async function showNotificationWindow(
  eventType: string,
  title: string,
  body: string,
  promptText: string,
  dismissSeconds: number,
  popupLabel?: string,
): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('show_notification', {
    eventType,
    title,
    body,
    promptText,
    dismissSeconds,
    popupLabel,
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
