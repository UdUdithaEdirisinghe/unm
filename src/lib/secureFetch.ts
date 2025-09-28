// src/lib/secureFetch.ts

/**
 * Secure fetch wrapper:
 * - Reads CSRF token from non-HttpOnly cookie (manny_csrf)
 * - Automatically attaches X-CSRF-Token header
 * - Ensures same-origin credentials
 */
export async function secureFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  // read CSRF token from cookies
  const csrfMatch = document.cookie.match(/(?:^|;\s*)manny_csrf=([^;]+)/);
  const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";

  const headers = new Headers(init.headers || {});
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin", // include cookies
  });
}