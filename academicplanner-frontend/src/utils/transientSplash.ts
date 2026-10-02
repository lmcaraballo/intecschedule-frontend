const nextSplashKey = 'academicplanner:next-splash';

export function queueNextSplash(message: string) {
  try { window.sessionStorage.setItem(nextSplashKey, message); } catch { /* splash is decorative */ }
}

export function takeNextSplash() {
  try {
    const message = window.sessionStorage.getItem(nextSplashKey);
    window.sessionStorage.removeItem(nextSplashKey);
    return message;
  } catch { return null; }
}
