import { Component, OnInit, AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService } from '../../../services/users.service';
import { SystemUser } from '../../../interface/system-user';
import { UserFormDialogComponent, UserFormData } from './user-form-dialog.component';
import { UserDeleteDialogComponent } from './user-delete-dialog.component';
import { SnackbarService } from '../../../services/snackbar.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit, AfterViewInit {
  readonly displayedColumns: string[] = [
    'user',
    'email',
    'role',
    'active',
    'lastAccess',
    'actions',
  ];
  users: SystemUser[] = [];

  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  readonly dialogRef = inject(MatDialogRef<UserManagementComponent>, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  loadUsers(): void {
    this.usersService.getAll().subscribe((users) => {
      this.users = users;
      this.cdr.detectChanges();
    });
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'seller':
        return 'Vendedor';
      case 'warehouse':
        return 'Bodega';
      default:
        return role;
    }
  }

  userInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  /** Relativo "hace X" basado en updatedAt (proxy del último acceso). */
  lastAccess(user: SystemUser): string {
    const date = (user as any).updatedAt ?? (user as any).createdAt;
    if (!date) return '—';
    const diffH = (Date.now() - new Date(date).getTime()) / 3600000;
    if (diffH < 1) return 'hace un momento';
    if (diffH < 24) return `hace ${Math.round(diffH)} h`;
    if (diffH < 720) return `hace ${Math.round(diffH / 24)} d`;
    return 'hace mucho';
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '500px',
      disableClose: true,
      data: null as UserFormData | null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers();
        this.snackbar.openSnackBar('Usuario creado exitosamente');
      }
    });
  }

  openEditDialog(user: SystemUser): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '500px',
      disableClose: true,
      data: { user } as UserFormData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers();
        this.snackbar.openSnackBar('Usuario actualizado exitosamente');
      }
    });
  }

  openDeleteDialog(user: SystemUser): void {
    const dialogRef = this.dialog.open(UserDeleteDialogComponent, {
      width: '420px',
      disableClose: true,
      data: user,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers();
        this.snackbar.openSnackBar('Usuario desactivado exitosamente');
      }
    });
  }

  close(): void {
    this.dialogRef?.close();
  }
}
