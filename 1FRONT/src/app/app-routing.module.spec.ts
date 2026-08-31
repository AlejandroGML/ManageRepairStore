import { routes } from './app-routing.module';

describe('AppRoutingModule', () => {
  it('should export a routes array', () => {
    expect(Array.isArray(routes)).toBe(true);
  });

  it('should have the expected route count', () => {
    expect(routes.length).toBe(0);
  });
});
