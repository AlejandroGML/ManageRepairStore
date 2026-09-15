import { Component, AfterViewInit, ChangeDetectorRef, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SystemUser } from '../../../interface/system-user';
import { UsersService, CreateUserDto, UpdateUserDto } from '../../../services/users.service';
import { TPipe } from '../../../i18n/t.pipe';

export interface UserFormData {
  user?: SystemUser;
}

@Component({
  selector: 'app-modal-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, TPipe],
  templateUrl: './modal-user-form.component.html',
  styleUrls: ['./modal-user-form.component.css'],
})
export class ModalUserFormComponent implements AfterViewInit {
  isEditMode: boolean;

  form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.minLength(8)]),
    role: new FormControl<'admin' | 'seller' | 'warehouse'>('seller', [Validators.required]),
  });

  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private dialogRef: MatDialogRef<ModalUserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserFormData | null,
    private usersService: UsersService
  ) {
    this.isEditMode = !!data?.user;
    if (this.isEditMode && data?.user) {
      this.form.patchValue({
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        password: '',
      });
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
    } else {
      this.form.get('password')?.addValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) return;

    const { name, email, password, role } = this.form.value;

    if (this.isEditMode && this.data?.user) {
      const dto: UpdateUserDto = { name: name!, email: email!, role: role! };
      if (password) dto.password = password;
      this.usersService.update(this.data.user.id, dto).subscribe({
        next: (user) => this.dialogRef.close(user),
        error: () => this.dialogRef.close(null),
      });
    } else {
      const dto: CreateUserDto = { name: name!, email: email!, password: password!, role: role! };
      this.usersService.create(dto).subscribe({
        next: (user) => this.dialogRef.close(user),
        error: () => this.dialogRef.close(null),
      });
    }
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
