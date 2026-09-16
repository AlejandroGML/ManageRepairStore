/**
 * Resolves the backend base URL for the current environment.
 * Extracted from BackendService.getBackendUrl() so every API service
 * can share the same resolution logic without circular DI.
 */
export function getApiUrl(): string {
  const host = window.location.hostname;

  // Development: backend runs directly on :3000 (API is namespaced under /api)
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }

  // Production: same origin — the backend serves the SPA and mounts the API
  // under /api (see 2BACK/src/main.ts)
  return '/api';
}
