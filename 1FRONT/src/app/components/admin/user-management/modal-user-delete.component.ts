import { Component, AfterViewInit, ChangeDetectorRef, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SystemUser } from '../../../interface/system-user';
import { UsersService } from '../../../services/users.service';
import { AuthService } from '../../../services/auth.service';

/** Data del diálogo: usuario + modo (desactivar o borrado definitivo). */
export interface UserDeleteDialogData {
  user: SystemUser;
  hard?: boolean;
}

@Component({
  selector: 'app-modal-user-delete',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './modal-user-delete.component.html',
  styleUrls: ['./modal-user-delete.component.css'],
})
export class ModalUserDeleteComponent implements AfterViewInit {
  errorMessage: string | null = null;
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private dialogRef: MatDialogRef<ModalUserDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserDeleteDialogData
  ) {}

  get user(): SystemUser {
    return this.data.user;
  }

  get hard(): boolean {
    return this.data.hard === true;
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  deactivate(): void {
    const currentUser = this.authService.getCurrentUser();

    if (currentUser && currentUser.id === this.user.id) {
      this.errorMessage = 'No puedes desactivar tu propia cuenta';
      return;
    }

    this.usersService.deactivate(this.user.id).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.dialogRef.close(null),
    });
  }

  hardDelete(): void {
    const currentUser = this.authService.getCurrentUser();

    if (currentUser && currentUser.id === this.user.id) {
      this.errorMessage = 'No puedes eliminar tu propia cuenta';
      return;
    }

    this.usersService.remove(this.user.id).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.dialogRef.close(null),
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
