(() => {
  let preference;
  try {
    preference = localStorage.getItem('nwc-theme');
  } catch (error) {
    if (
      !(error instanceof DOMException) ||
      !['QuotaExceededError', 'SecurityError'].includes(error.name)
    ) {
      throw error;
    }
  }
  const valid = preference === 'light' || preference === 'dark' || preference === 'system';
  const selected = valid ? preference : 'system';
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme =
    selected === 'system' ? (dark ? 'dark' : 'light') : selected;
  document.documentElement.dataset.themePreference = selected;
})();
