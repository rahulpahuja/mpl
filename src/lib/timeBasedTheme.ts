// Dark mode is driven purely by the device's local wall-clock time, not the
// OS/browser color-scheme preference — the app should look the same
// regardless of what the system theme is set to.
const DARK_FROM_HOUR = 18 // 6pm
const DARK_UNTIL_HOUR = 6 // 6am

export function isDarkHour(date = new Date()): boolean {
  const hour = date.getHours()
  return hour >= DARK_FROM_HOUR || hour < DARK_UNTIL_HOUR
}

export function applyTimeBasedTheme() {
  document.documentElement.classList.toggle('dark', isDarkHour())
}
