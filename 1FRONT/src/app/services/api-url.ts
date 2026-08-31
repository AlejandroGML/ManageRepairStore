/**
 * Resolves the backend base URL for the current environment.
 * Extracted from BackendService.getBackendUrl() so every API service
 * can share the same resolution logic without circular DI.
 */
export function getApiUrl(): string {
  // For development: use localhost:3000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  // For production: use the configured IP
  return 'http://192.168.50.101:3000';
}
