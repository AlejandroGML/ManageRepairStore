import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { UserProfile } from 'src/app/interface/user-profile';
import { AuthService } from 'src/app/services/auth.service';
import { UserManagementComponent } from '../../admin/user-management/user-management.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, RouterModule, ThemeToggleComponent],
})
export class NavbarComponent {
  showLogout = false;
  @Input() userLogged: UserProfile | undefined = undefined;
  @Output() setLoggedEvent = new EventEmitter<UserProfile | undefined>();

  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  openAdminPanel(): void {
    this.dialog.open(UserManagementComponent, {
      width: '90vw',
      maxWidth: '1200px',
      panelClass: 'admin-dialog',
    });
  }

  logout() {
    this.authService.logout();
    this.setLoggedEvent.emit(undefined);
  }
}
