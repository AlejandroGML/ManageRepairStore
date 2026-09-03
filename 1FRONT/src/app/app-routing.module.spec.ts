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
      expect.arrayContaining(['panel', 'ventas', 'registrar', 'bodega', 'clientes', 'admin']),
    );
  });

  it('should redirect legacy /productos and /reposiciones into /bodega', () => {
    const shell = routes.find((r) => r.path === '');
    const productos = (shell?.children ?? []).find((c) => c.path === 'productos');
    const reposiciones = (shell?.children ?? []).find((c) => c.path === 'reposiciones');
    expect(productos).toBeDefined();
    expect(reposiciones).toBeDefined();
    if (productos) {
      expect(productos.redirectTo).toBe('bodega/inventario');
    }
    if (reposiciones) {
      expect(reposiciones.redirectTo).toBe('bodega/reposiciones');
    }
  });

  it('should nest inventario/reposiciones under /bodega', () => {
    const shell = routes.find((r) => r.path === '');
    const bodega = (shell?.children ?? []).find((c) => c.path === 'bodega');
    const childPaths = (bodega?.children ?? []).map((c) => c.path);
    expect(childPaths).toEqual(
      expect.arrayContaining(['inventario', 'reposiciones']),
    );
  });
});