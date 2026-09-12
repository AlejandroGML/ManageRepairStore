import { routes } from './app-routing.module';

describe('AppRoutingModule', () => {
  it('should export a routes array', () => {
    expect(Array.isArray(routes)).toBe(true);
  });

  it('should have a public login route protected by homeRedirectGuard', () => {
    const login = routes.find((r) => r.path === 'login');
    expect(login).toBeDefined();
    expect(login?.canActivate).toBeDefined();
  });

  it('should have an authenticated shell with children', () => {
    const shell = routes.find((r) => r.path === '');
    expect(shell).toBeDefined();
    expect(shell?.canActivate).toBeDefined();
    expect((shell?.children ?? []).length).toBeGreaterThan(0);
  });

  it('should expose the shell screens as children (bodega unificada)', () => {
    const shell = routes.find((r) => r.path === '');
    const paths = (shell?.children ?? []).map((c) => c.path);
    expect(paths).toEqual(
      jasmine.arrayContaining([
        '',
        'panel',
        'ventas',
        'registrar',
        'bodega',
        'clientes',
        'admin',
      ])
    );
  });

  it('should nest inventario and reposiciones under bodega', () => {
    const shell = routes.find((r) => r.path === '');
    const bodega = (shell?.children ?? []).find((c) => c.path === 'bodega');
    expect(bodega).toBeDefined();
    const childPaths = (bodega?.children ?? []).map((c) => c.path);
    expect(childPaths).toContain('');
    expect(childPaths).toContain('inventario');
    expect(childPaths).toContain('reposiciones');
    // El redirect del hijo vacío lleva a inventario
    const empty = (bodega?.children ?? []).find((c) => c.path === '');
    expect(empty?.redirectTo).toBe('inventario');
  });

  it('should declare title and sub data on every screen child', () => {
    const shell = routes.find((r) => r.path === '');
    const screenChildren = (shell?.children ?? []).filter((c) => c.path);
    expect(screenChildren.length).toBeGreaterThan(0);
    for (const child of screenChildren) {
      const data = child.data as { title?: string; sub?: string } | undefined;
      expect(data?.title).toBeTruthy();
      expect(data?.sub).toBeTruthy();
    }
  });

  it('should redirect unknown paths to the root', () => {
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard).toBeDefined();
    expect(wildcard?.redirectTo).toBe('');
  });
});
