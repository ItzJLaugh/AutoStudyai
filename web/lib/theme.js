export function resolveTheme(pathname, savedTheme) {
  if (pathname === '/' || pathname === '/reset-password') return 'light';
  return savedTheme === 'dark' ? 'dark' : 'light';
}
