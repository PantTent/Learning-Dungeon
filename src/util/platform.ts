// Where the game is running: the Android app, or a web browser.

/** True inside the installed Android app (Capacitor). */
export function inApp(): boolean {
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

/** A web browser on an Android phone or tablet (could install the app). */
export function androidBrowser(): boolean {
  return !inApp() && /Android/i.test(navigator.userAgent);
}

/** The newest Android app, built by GitHub on every update. */
export const APK_URL = 'https://github.com/PantTent/Learning-Dungeon/releases/download/android-latest/LearningDungeon.apk';
