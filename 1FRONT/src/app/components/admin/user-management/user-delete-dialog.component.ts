import { Component, AfterViewInit, ChangeDetectorRef, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SystemUser } from '../../../interface/system-user';
import { UsersService } from '../../../services/users.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './user-delete-dialog.component.html',
  styleUrls: ['./user-delete-dialog.component.css'],
})
export class UserDeleteDialogComponent implements AfterViewInit {
  errorMessage: string | null = null;
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private dialogRef: MatDialogRef<UserDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public user: SystemUser
  ) {}

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

  close(): void {
    this.dialogRef.close(null);
  }
}
