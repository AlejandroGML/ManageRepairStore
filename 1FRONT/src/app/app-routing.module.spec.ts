import { routes } from './app-routing.module';

describe('AppRoutingModule', () => {
  it('should export a routes array', () => {
    expect(Array.isArray(routes)).toBe(true);
  });

  it('should have a login route', () => {
    expect(routes.some((r) => r.path === 'login')).toBe(true);
  });

  it('should have an authenticated shell with children', () => {
    const shell = routes.find((r) => r.path === '');
    expect(shell).toBeDefined();
    expect(shell?.children?.length).toBeGreaterThan(0);
    expect(shell?.canActivate).toBeDefined();
  });

  it('should expose the main screens as shell children', () => {
    const shell = routes.find((r) => r.path === '');
    const paths = (shell?.children ?? []).map((c) => c.path);
    expect(paths).toEqual(
      expect.arrayContaining(['panel', 'ventas', 'registrar', 'productos', 'bodega', 'reposiciones', 'clientes', 'admin']),
    );
  });
});