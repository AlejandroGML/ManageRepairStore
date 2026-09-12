import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthApiService } from './auth.api.service';
import { getApiUrl } from './api-url';
import { UserProfile } from '../interface/user-profile';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;
  const base = getApiUrl();

  const mockLoginResponse = {
    access_token: 'jwt-token-abc-123',
    user: { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' } as UserProfile,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should POST credentials to /auth/login and return the response', () => {
    service.login('admin@demo.example', 'Admin123!').subscribe((res) => {
      expect(res.access_token).toBe('jwt-token-abc-123');
      expect(res.user.email).toBe('admin@demo.example');
    });

    const req = httpMock.expectOne(`${base}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@demo.example', password: 'Admin123!' });
    req.flush(mockLoginResponse);
  });
});
