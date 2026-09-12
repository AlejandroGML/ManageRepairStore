import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UsersService } from './users.service';
import { SystemUser } from '../interface/system-user';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  const mockUsers: SystemUser[] = [
    { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin', active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
    { id: 2, name: 'Vendedor', email: 'test@demo.example', role: 'seller', active: true, createdAt: '2025-01-02T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z' },
  ];

  const mockSingleUser: SystemUser = { id: 3, name: 'Bodega', email: 'test@demo.example', role: 'warehouse', active: false, createdAt: '2025-01-03T00:00:00Z', updatedAt: '2025-01-03T00:00:00Z' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UsersService,
      ],
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
    // Derive baseUrl from the service's internal logic
    baseUrl = service.getBaseUrlForTest();
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ─── Task: getAll() ────────────────────────────────────────
  describe('getAll', () => {
    it('should fetch all users via GET /users', () => {
      service.getAll().subscribe((users) => {
        expect(users).toEqual(mockUsers);
        expect(users.length).toBe(2);
      });

      const req = httpMock.expectOne(`${baseUrl}/users`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });

    it('should handle empty user list', () => {
      service.getAll().subscribe((users) => {
        expect(users).toEqual([]);
        expect(users.length).toBe(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/users`);
      req.flush([]);
    });
  });

  // ─── Task: getById() ───────────────────────────────────────
  describe('getById', () => {
    it('should fetch a single user via GET /users/:id', () => {
      service.getById(3).subscribe((user) => {
        expect(user).toEqual(mockSingleUser);
        expect(user.id).toBe(3);
      });

      const req = httpMock.expectOne(`${baseUrl}/users/3`);
      expect(req.request.method).toBe('GET');
      req.flush(mockSingleUser);
    });

    it('should return 404 for non-existent user', () => {
      service.getById(999).subscribe({
        next: () => fail('Expected error'),
        error: (err) => {
          expect(err.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/users/999`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  // ─── Task: create() ────────────────────────────────────────
  describe('create', () => {
    it('should create a user via POST /users', () => {
      const newUser = { name: 'Nuevo', email: 'test@demo.example', password: 'Password1', role: 'warehouse' as const };
      const createdUser: SystemUser = { id: 4, ...newUser, active: true, createdAt: '2025-01-04T00:00:00Z', updatedAt: '2025-01-04T00:00:00Z' };

      service.create(newUser).subscribe((user) => {
        expect(user).toEqual(createdUser);
        expect(user.email).toBe('test@demo.example');
      });

      const req = httpMock.expectOne(`${baseUrl}/users`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newUser);
      req.flush(createdUser);
    });

    it('should fail when email already exists (409)', () => {
      const duplicate = { name: 'Duplicado', email: 'test@demo.example', password: 'Password1', role: 'seller' as const };

      service.create(duplicate).subscribe({
        next: () => fail('Expected 409 error'),
        error: (err) => {
          expect(err.status).toBe(409);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/users`);
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });
  });

  // ─── Task: update() ────────────────────────────────────────
  describe('update', () => {
    it('should update a user via PATCH /users/:id', () => {
      const changes = { name: 'Nombre Actualizado', role: 'admin' as const };
      const updatedUser: SystemUser = { ...mockUsers[0], ...changes, updatedAt: '2025-01-05T00:00:00Z' };

      service.update(1, changes).subscribe((user) => {
        expect(user).toEqual(updatedUser);
        expect(user.name).toBe('Nombre Actualizado');
      });

      const req = httpMock.expectOne(`${baseUrl}/users/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(changes);
      req.flush(updatedUser);
    });

    it('should update password if provided', () => {
      const changes = { password: 'NewPassword1!' };

      service.update(2, changes).subscribe(() => {
        // success — no additional assertion needed
      });

      const req = httpMock.expectOne(`${baseUrl}/users/2`);
      expect(req.request.body).toEqual(changes);
      req.flush({ ...mockUsers[1], updatedAt: '2025-01-05T00:00:00Z' });
    });
  });

  // ─── Task: deactivate() ────────────────────────────────────
  describe('deactivate', () => {
    it('should deactivate user via PATCH /users/:id with active=false', () => {
      const deactivatedUser: SystemUser = { ...mockUsers[0], active: false, updatedAt: '2025-01-06T00:00:00Z' };

      service.deactivate(1).subscribe((user) => {
        expect(user).toEqual(deactivatedUser);
        expect(user.active).toBeFalse();
      });

      const req = httpMock.expectOne(`${baseUrl}/users/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ active: false });
      req.flush(deactivatedUser);
    });
  });
});
