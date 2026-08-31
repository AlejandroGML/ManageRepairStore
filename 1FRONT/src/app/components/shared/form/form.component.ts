import { Component, OnChanges, SimpleChanges, AfterViewInit, Input } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { LoadingService } from 'src/app/services/loading.service';
import { MatDialog } from '@angular/material/dialog';
import { Client } from 'src/app/interface/client';
import { UserProfile } from 'src/app/interface/user-profile';
import { RegisterComponent } from '../../client/register/register.component';
import { FinderComponent } from '../../client/finder/finder.component';
import { WarehouseComponent } from '../../warehouse/warehouse/warehouse.component';
import { SalesComponent } from '../../sales/sales/sales.component';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, RegisterComponent, FinderComponent, WarehouseComponent, SalesComponent],
})
export class FormComponent implements OnChanges, AfterViewInit {
  clients: Client[] = [];
  holderFilter: string[] = [];
  readonly ID_REGISTER_FOCUS = 'input-client';
  readonly TAB_REGISTER = 0;
  readonly TAB_DETAILS = 1;
  readonly TAB_WAREHOUSE = 2;
  readonly TAB_SALES = 3;
  @Input() userLogged: UserProfile | undefined = undefined;
  
  allowedTabs: number[] = []; // Tabs permitidos

  constructor(private loadingService: LoadingService, private dialog: MatDialog) {}

  ngOnInit() {
    this.setAllowedTabs();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      document.getElementById(this.ID_REGISTER_FOCUS)?.click();
    }, 200);
  }

  ngOnChanges(changes: SimpleChanges | any) {
    if (changes.clients) {
      this.clients = changes.clients.currentValue;
    }
  }

  changeTab(selectedIndex: number) {
    let idFocus = '';
    selectedIndex === this.TAB_REGISTER ? idFocus = this.ID_REGISTER_FOCUS : idFocus = 'input-filter';
    setTimeout(() => {
      document.getElementById(idFocus)?.click();
    }, 300);
  }

  private setAllowedTabs() {
    if (this.userLogged) {
      switch (this.userLogged.role) {
        case 'admin':
          this.allowedTabs = [this.TAB_REGISTER, this.TAB_DETAILS, this.TAB_WAREHOUSE, this.TAB_SALES];
          break;
        case 'warehouse':
          this.allowedTabs = [this.TAB_WAREHOUSE];
          break;
        case 'seller':
          this.allowedTabs = [this.TAB_SALES];
          break;
        default:
          this.allowedTabs = [];
      }
    }
  }

  public removeUserById(id: number) {
    this.clients = this.clients.filter(u => u.id !== id);
  }
}
