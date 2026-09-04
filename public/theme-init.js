(() => {
  const preference = localStorage.getItem('nwc-theme');
  const valid = preference === 'light' || preference === 'dark' || preference === 'system';
  const selected = valid ? preference : 'system';
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme =
    selected === 'system' ? (dark ? 'dark' : 'light') : selected;
  document.documentElement.dataset.themePreference = selected;
})();
