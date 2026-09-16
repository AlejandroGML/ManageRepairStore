/**
 * Resolves the backend base URL for the current environment.
 * Extracted from BackendService.getBackendUrl() so every API service
 * can share the same resolution logic without circular DI.
 */
export function getApiUrl(): string {
  // Always same-origin: production is served by NestJS itself (API under /api,
  // see 2BACK/src/main.ts) and the dev server proxies /api to the backend
  // (see proxy.conf.json). No hostname sniffing — it breaks tunnels, LAN
  // access and any non-localhost origin.
  return '/api';
}
