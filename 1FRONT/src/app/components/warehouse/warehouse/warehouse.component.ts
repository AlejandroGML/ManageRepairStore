import { Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { UserProfile } from 'src/app/interface/user-profile';
import { AuthService } from 'src/app/services/auth.service';
import { ProductComponent } from '../../product/product/product.component';
import { RefillsComponent } from '../../product/refills/refills.component';

@Component({
  selector: 'app-warehouse',
  templateUrl: './warehouse.component.html',
  styleUrls: ['./warehouse.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, ProductComponent, RefillsComponent],
})
export class WarehouseComponent implements OnInit {
  private readonly authService = inject(AuthService);

  get userLogged(): UserProfile | undefined {
    return this.authService.getCurrentUser() ?? undefined;
  }

  readonly ID_WAREHOUSE_FOCUS = 'input-client';
  readonly TAB_PRODUCTS = 0;
  readonly TAB_SALES = 1;
  readonly TAB_REFILLS = 2;

  allowedSubTabs: number[] = []; // Subpestañas permitidas

  ngOnInit(): void {
    this.setAllowedSubTabs();
  }

  changeTab(selectedIndex: number) {
    let idFocus = '';
    selectedIndex === this.TAB_PRODUCTS ? idFocus = this.ID_WAREHOUSE_FOCUS : idFocus = 'input-filter';
    setTimeout(() => {
      document.getElementById(idFocus)?.click();
    }, 300);
  }

  private setAllowedSubTabs() {
    if (this.userLogged) {
      switch (this.userLogged.role) {
        case 'admin':
          this.allowedSubTabs = [this.TAB_PRODUCTS, this.TAB_SALES, this.TAB_REFILLS];
          break;
        case 'warehouse':
          this.allowedSubTabs = [this.TAB_PRODUCTS, this.TAB_REFILLS];
          break;
        case 'seller':
          this.allowedSubTabs = [this.TAB_SALES];
          break;
        default:
          this.allowedSubTabs = [];
      }
    }
  }
}
