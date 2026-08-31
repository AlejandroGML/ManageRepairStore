import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserProfile } from '../interface/user-profile';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockLoginResponse = {
    access_token: 'jwt-token-abc-123',
    user: { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' } as UserProfile,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([])],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('login()', () => {
    it('should POST to /auth/login with email and password', () => {
      service.login('admin@demo.example', 'Admin123!').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'admin@demo.example', password: 'Admin123!' });
      req.flush(mockLoginResponse);
    });

    it('should store access_token and current_user in localStorage on success', () => {
      service.login('admin@demo.example', 'Admin123!').subscribe(() => {
        expect(localStorage.getItem('access_token')).toBe('jwt-token-abc-123');
        const storedUser = JSON.parse(localStorage.getItem('current_user')!);
        expect(storedUser.email).toBe('admin@demo.example');
        expect(storedUser.role).toBe('admin');
      });

      const req = httpMock.expectOne('http://localhost:3000/auth/login');
      req.flush(mockLoginResponse);
    });

    it('should expose currentUser via BehaviorSubject after login', (done) => {
      service.login('admin@demo.example', 'Admin123!').subscribe(() => {
        service.currentUser$.subscribe((user) => {
          expect(user?.email).toBe('admin@demo.example');
          expect(user?.role).toBe('admin');
          done();
        });
      });

      const req = httpMock.expectOne('http://localhost:3000/auth/login');
      req.flush(mockLoginResponse);
    });
  });

  describe('logout()', () => {
    it('should clear localStorage keys and navigate to /login', () => {
      localStorage.setItem('access_token', 'some-token');
      localStorage.setItem('current_user', JSON.stringify(mockLoginResponse.user));
      const navigateSpy = spyOn(router, 'navigate');

      service.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('current_user')).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should emit null via currentUser$ after logout', (done) => {
      localStorage.setItem('access_token', 'some-token');
      localStorage.setItem('current_user', JSON.stringify(mockLoginResponse.user));
      spyOn(router, 'navigate');

      service.logout();

      service.currentUser$.subscribe((user) => {
        expect(user).toBeNull();
        done();
      });
    });
  });

  describe('getToken()', () => {
    it('should return the stored token from localStorage', () => {
      localStorage.setItem('access_token', 'my-token');
      expect(service.getToken()).toBe('my-token');
    });

    it('should return null when no token is stored', () => {
      localStorage.removeItem('access_token');
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isLoggedIn()', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('access_token', 'some-token');
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('should return false when no token exists', () => {
      localStorage.removeItem('access_token');
      expect(service.isLoggedIn()).toBeFalse();
    });
  });

  describe('isAdmin()', () => {
    it('should return true when current user role is admin', () => {
      service.login('admin@demo.example', 'Admin123!').subscribe();
      httpMock.expectOne('http://localhost:3000/auth/login').flush(mockLoginResponse);
      expect(service.isAdmin()).toBeTrue();
    });

    it('should return false when current user role is seller', () => {
      const sellerResponse = {
        access_token: 'seller-token',
        user: { id: 2, name: 'Seller', email: 'seller@demo.example', role: 'seller' } as UserProfile,
      };
      service.login('seller@demo.example', 'pass123').subscribe();
      httpMock.expectOne('http://localhost:3000/auth/login').flush(sellerResponse);
      expect(service.isAdmin()).toBeFalse();
    });
  });

  describe('getCurrentUser()', () => {
    it('should return the current user after login', () => {
      service.login('admin@demo.example', 'Admin123!').subscribe(() => {
        const user = service.getCurrentUser();
        expect(user?.email).toBe('admin@demo.example');
        expect(user?.name).toBe('Admin');
        expect(user?.role).toBe('admin');
      });
      httpMock.expectOne('http://localhost:3000/auth/login').flush(mockLoginResponse);
    });

    it('should return null before login', () => {
      expect(service.getCurrentUser()).toBeNull();
    });
  });
});
