import { Component, OnInit, AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService } from '../../../services/users.service';
import { SystemUser } from '../../../interface/system-user';
import { ModalUserFormComponent, UserFormData } from './modal-user-form.component';
import { ModalUserDeleteComponent, UserDeleteDialogData } from './modal-user-delete.component';
import { SnackbarService } from '../../../services/snackbar.service';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit, AfterViewInit {
  users: SystemUser[] = [];

  private readonly usersService = inject(UsersService);
  private readonly modal = inject(ModalService);
  private readonly snackbar = inject(SnackbarService);
  // Optional: la pantalla se monta como ruta (no dentro de un dialog).
  private readonly dialogRef = inject(MatDialogRef<UserManagementComponent>, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  loadUsers(): void {
    this.usersService.getAll().subscribe((users) => {
      this.users = users ?? [];
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

  /** Avatar: primera letra del nombre en mayúscula. */
  userInitials(name: string): string {
    return (name.trim().charAt(0) ?? '').toUpperCase();
  }

  /** Relativo "hace X" basado en updatedAt (proxy del último acceso). */
  lastAccess(user: SystemUser): string {
    const date = (user as any).updatedAt ?? (user as any).createdAt;
    if (!date) return '—';
    const diffMin = (Date.now() - new Date(date).getTime()) / 60000;
    if (diffMin < 1) return 'hace un momento';
    if (diffMin < 60) return `hace ${Math.round(diffMin)} min`;
    const diffH = diffMin / 60;
    if (diffH < 24) return `hace ${Math.round(diffH)} h`;
    const diffD = diffH / 24;
    return `hace ${Math.round(diffD)} días`;
  }

  openCreateDialog(): void {
    const dialogRef = this.modal.open(ModalUserFormComponent, {
      size: 'md',
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
    const dialogRef = this.modal.open(ModalUserFormComponent, {
      size: 'md',
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

  /** Reactiva un usuario desactivado (acción directa, no destructiva). */
  activateUser(user: SystemUser): void {
    this.usersService.activate(user.id).subscribe({
      next: () => {
        this.loadUsers();
        this.snackbar.openSnackBar('Usuario activado exitosamente');
      },
      error: () => this.snackbar.openSnackBar('Error al activar el usuario'),
    });
  }

  openDeleteDialog(user: SystemUser): void {
    // Usuario activo → desactivar. Ya desactivado → borrado definitivo.
    const hard = !user.active;
    const dialogRef = this.modal.open(ModalUserDeleteComponent, {
      size: 'sm',
      disableClose: true,
      data: { user, hard } as UserDeleteDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers();
        this.snackbar.openSnackBar(
          hard ? 'Usuario eliminado definitivamente' : 'Usuario desactivado exitosamente'
        );
      }
    });
  }

  close(): void {
    this.dialogRef?.close();
  }
}
