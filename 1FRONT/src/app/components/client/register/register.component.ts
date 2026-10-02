import { Component, OnDestroy, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { OrdenIngreso } from 'src/app/interface/ficha-tecnica';
import { ClientsApiService, DuplicateMatch } from 'src/app/services/clients.api.service';
import { CompaniesApiService, CompanyRow } from 'src/app/services/companies.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { Client } from 'src/app/interface/client';
import { LoadingService } from 'src/app/services/loading.service';
import { ModalChoiceClientComponent } from '../modal-choice-client/modal-choice-client.component';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { PdfService } from 'src/app/services/pdf.service';
import { PdfComponent } from '../../shared/pdf/pdf.component';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';
import { RutInputComponent } from '../../shared/rut-input/rut-input.component';
import {
  ModalDuplicateClientComponent,
  DuplicateClientResult,
} from '../modal-duplicate-client/modal-duplicate-client.component';
import { ModalEditClientComponent } from '../modal-edit-client/modal-edit-client.component';
import { ModalCompaniesComponent } from '../modal-companies/modal-companies.component';
import { ModalService } from 'src/app/services/modal.service';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, PdfComponent, NamePipe, RutPipe, RutInputComponent],
})
export class RegisterComponent implements OnDestroy {
  clients: Client[] = [];
  readonly NOT_FOUND = -1;
  /** Búsqueda de cliente particular (panel superior): campo + filtro. */
  searchQuery = new FormControl('');
  searchField: 'name' | 'rut' = 'name';
  searchResults: Array<Client & { orderCount: number }> = [];
  searchAttempted = false;
  private readonly searchTrigger = new Subject<void>();
  /** Búsqueda de empresas (autocomplete real, spec companies). */
  companyResults: CompanyRow[] = [];
  private readonly companyTrigger = new Subject<void>();
  /** Sucursales de la empresa elegida (selector del flujo empresa). */
  branches: Client[] = [];
  selectedCompany?: CompanyRow;
  private readonly destroy$ = new Subject<void>();
  ordenIngreso!: OrdenIngreso;
  lastClientAdded: number = 0;
  form: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    clientId: new FormControl(''),
    rut: new FormControl('', [Validators.required]),
    address: new FormControl('', [Validators.required]),
    city: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    email: new FormControl(''),
    has_company: new FormControl(false),
    company_name: new FormControl({ value: '', disabled: true }),
    companyId: new FormControl<number | null>(null),
    description: new FormControl('', [Validators.required]),
    observation: new FormControl('', [Validators.required]),
  });
  enablePDF: boolean = false;
  /** true cuando el RUT queda bloqueado con el de la empresa elegida. */
  rutLocked = false;

  private readonly loadingService = inject(LoadingService);
  private readonly modal = inject(ModalService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly snackBarService = inject(SnackbarService);
  private readonly pdfService = inject(PdfService);
  private readonly i18n = inject(I18nService);

  /** i18n keys de los labels de campo para el feedback de validación. */
  private readonly fieldLabelKeys: Record<string, string> = {
    name: 'common.client',
    rut: 'register.rutLabel',
    address: 'register.address',
    city: 'register.fieldCity',
    phone: 'register.phone',
    email: 'register.email',
    description: 'common.description',
    observation: 'register.fieldObservation',
  };

  constructor() {
    this.initData();
    this.searchTrigger
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.runClientSearch());
    this.companyTrigger
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.runCompanySearch());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initData(): void {
    this.ordenIngreso = {
      name: '',
      rut: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      description: '',
      observation: '',
      status: '',
    };
  }

  /** Badge del estado de la orden según el enum OrderStatus existente. */
  orderStatusBadgeClass(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'entregado':
      case 'completado':
        return 'badge-success';
      case 'en reparacion':
      case 'en reparación':
        return 'badge-neutral';
      case 'cancelado':
        return 'badge-error';
      case 'pendiente':
      default:
        return 'badge-warning';
    }
  }

  orderStatusLabel(status?: string): string {
    if (!status) return '—';
    return status === 'En reparacion' ? this.i18n.t('register.statusInRepair') : status;
  }

  // ─── Búsqueda de clientes particulares ──────────────────────────────────

  /** Dispara la búsqueda (debounce de 250 ms en el Subject). */
  onSearchInput(): void {
    this.searchAttempted = false;
    this.searchTrigger.next();
  }

  /** Cambió el filtro (Nombre | RUT): re-busca si ya hay texto. */
  onSearchFieldChange(field: 'name' | 'rut'): void {
    if (field === this.searchField) return;
    this.searchField = field;
    if (String(this.searchQuery.value ?? '').trim().length >= 2) {
      this.searchTrigger.next();
    }
  }

  /** Búsqueda server-side (GET /client/search) con debounce de 250 ms. */
  private runClientSearch(): void {
    const q = String(this.searchQuery.value ?? '').trim();
    if (q.length < 2) {
      this.searchResults = [];
      this.searchAttempted = false;
      return;
    }
    this.clientsApi.searchClients(q, this.searchField, 8).subscribe({
      next: (res) => {
        this.searchResults = res.items ?? [];
        this.searchAttempted = true;
      },
      error: () => {
        this.searchResults = [];
        this.searchAttempted = true;
      },
    });
  }

  /** Selecciona un cliente del resultado y autocompleta el formulario. */
  selectSearchResult(client: Client & { orderCount: number }): void {
    this.fillFormFromClient(client);
    this.clearSearch();
    const el = document.getElementById('id-description');
    if (el) el.focus();
  }

  /** RUT con contenido real (misma regla del matcher): ≥7 chars, no solo ceros. */
  hasMeaningfulRut(rut?: string | null): boolean {
    const clean = String(rut ?? '').replace(/[^0-9kK]/g, '');
    return clean.length >= 7 && !/^0+$/.test(clean);
  }

  private clearSearch(): void {
    this.searchQuery.setValue('', { emitEvent: false });
    this.searchResults = [];
    this.searchAttempted = false;
  }

  // ─── Flujo de empresa (Opción A: autocomplete real + sucursales) ────────

  /** Input del autocomplete de empresas (debounce de 250 ms). */
  onCompanyInput(): void {
    this.companyTrigger.next();
  }

  /** Muestra el nombre tanto para un objeto CompanyRow como para texto libre. */
  companyDisplay(company?: CompanyRow | string | null): string {
    if (!company) return '';
    return typeof company === 'string' ? company : company.name;
  }

  private runCompanySearch(): void {
    const q = String(this.form.get('company_name')?.value ?? '').trim();
    if (q.length < 2) {
      this.companyResults = [];
      return;
    }
    this.companiesApi.search(q, 8).subscribe({
      next: (res) => (this.companyResults = res.items ?? []),
      error: () => (this.companyResults = []),
    });
  }

  /** Eligió una empresa existente: RUT bloqueado + panel de sucursales. */
  onCompanySelected(event: MatAutocompleteSelectedEvent): void {
    this.applyCompany(event.option.value as CompanyRow);
  }

  private applyCompany(company: CompanyRow): void {
    this.selectedCompany = company;
    this.form.get('companyId')?.setValue(company.id ?? null);
    // Se guarda el OBJETO: el displayWith del autocomplete lo muestra y el
    // payload extrae company.name (con string queda el input en blanco).
    this.form.get('company_name')?.setValue(company as unknown as string);
    if (company.rutNormalizado) {
      this.form.get('rut')?.setValue(company.rutNormalizado);
      this.form.get('rut')?.disable();
      this.rutLocked = true;
    }
    this.loadBranches(company.id);
  }

  /** Carga las sucursales de la empresa (selector) — vacío si no hay id. */
  private loadBranches(companyId?: number): void {
    this.branches = [];
    if (!companyId) return;
    this.companiesApi.clients(companyId).subscribe({
      next: (branches) => (this.branches = branches ?? []),
      error: () => (this.branches = []),
    });
  }

  /** Reusar una sucursal: ancla clientId y completa el formulario. */
  selectBranch(client: Client): void {
    this.form.patchValue({
      clientId: client.id,
      name: client.name,
      rut: client.rut_raw,
      address: client.address,
      city: client.city,
      phone: client.phone,
      email: client.email,
      description: '',
      observation: '',
    });
    const company = this.selectedCompany;
    if (company) {
      this.form.get('companyId')?.setValue(company.id ?? null);
      this.form.get('company_name')?.setValue(company as unknown as string);
      this.form.get('rut')?.setValue(company.rutNormalizado);
      this.form.get('rut')?.disable();
      this.rutLocked = true;
    }
    const el = document.getElementById('id-description');
    if (el) el.focus();
  }

  /** Nueva sucursal de la empresa elegida: campos del cliente en blanco. */
  nuevaSucursal(): void {
    this.form.patchValue({
      clientId: '',
      name: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      description: '',
      observation: '',
    });
    const el = document.getElementById('input-client');
    if (el) el.focus();
  }

  /** Desbloquea el RUT (particular o sin empresa). */
  private unlockRut(): void {
    this.form.get('rut')?.enable();
    this.rutLocked = false;
  }

  /** Modal "Gestionar empresas": renombrar; refresca la empresa elegida. */
  openManageCompanies(): void {
    this.modal
      .open(ModalCompaniesComponent, { size: 'lg' })
      .afterClosed()
      .subscribe((renamed?: Array<{ id: number; name: string }>) => {
        if (!renamed?.length || !this.selectedCompany) return;
        const mine = renamed.find((r) => r.id === this.selectedCompany!.id);
        if (mine) {
          this.selectedCompany = { ...this.selectedCompany, name: mine.name };
          this.form.get('company_name')?.setValue(this.selectedCompany as unknown as string);
        }
      });
  }

  registerOrder(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      // Feedback explícito: antes esto retornaba en silencio y parecía que "no ocurría nada".
      const missing = Object.keys(this.form.controls)
        .filter((k) => this.form.get(k)?.invalid && !['has_company', 'company_name', 'companyId'].includes(k))
        .map((k) => {
          const labelKey = this.fieldLabelKeys[k];
          return labelKey ? this.i18n.t(labelKey) : k;
        });
      this.snackBarService.openSnackBar(
        missing.length
          ? this.i18n.t('register.missingFields', { fields: missing.join(', ') })
          : this.i18n.t('register.formErrors')
      );
      return;
    }

    const { has_company, ...payload } = this.form.getRawValue();
    payload.status = 'Pendiente';
    payload.is_company = has_company === true;
    // company_name puede ser el objeto de la empresa elegida o el texto libre
    // de una empresa nueva; el backend recibe SIEMPRE el nombre plano.
    const rawCompanyName = payload.company_name;
    payload.company_name = !rawCompanyName
      ? ''
      : typeof rawCompanyName === 'string'
        ? rawCompanyName
        : (rawCompanyName as unknown as CompanyRow).name ?? '';
    // Sin empresa: la orden va como particular limpio.
    if (!has_company) {
      payload.company_name = '';
      payload.companyId = null;
    }
    const value = payload as OrdenIngreso;
    if (!value.clientId) value.clientId = 0;

    this.loadingService.setLoading(true);

    // Anti-duplicados con exclusión por identidad (spec order-registration):
    // el cliente seleccionado y TODA su empresa quedan fuera del chequeo.
    const dupInput: {
      name?: string;
      rut?: string;
      address?: string;
      phone?: string;
      email?: string;
      clientId?: number;
      companyId?: number;
    } = {
      name: value.name,
      address: value.address,
      phone: value.phone,
      email: value.email,
      rut: value.rut,
    };
    if (value.clientId) {
      dupInput.clientId = Number(value.clientId);
    }
    const companyId = Number(this.form.get('companyId')?.value ?? 0);
    if (companyId) {
      dupInput.companyId = companyId;
    }
    this.clientsApi.checkDuplicates(dupInput).subscribe({
      next: (res) => {
        if (res.count === 0 || !res.matches?.length) {
          this.submitOrder(value);
          return;
        }
        this.openDuplicateModal(res.matches, value);
      },
      error: () => {
        // Chequeo best-effort: si falla, no bloqueamos el registro.
        this.submitOrder(value);
      },
    });
  }

  /** Modal anti-duplicados: usar existente, editar, crear igual o cancelar. */
  private openDuplicateModal(matches: DuplicateMatch[], base: OrdenIngreso): void {
    this.modal
      .open(ModalDuplicateClientComponent, {
        size: 'lg',
        disableClose: true,
        data: { matches },
      })
      .afterClosed()
      .subscribe((res: DuplicateClientResult | undefined) => {
        if (!res) {
          this.loadingService.setLoading(false); // cancelar: vuelve al form intacto
          return;
        }
        if (res.action === 'use') {
          this.submitOrder(this.payloadFromClient(res.client, base));
        } else if (res.action === 'edit') {
          this.modal
            .open(ModalEditClientComponent, {
              size: 'lg',
              data: { ...res.client },
              disableClose: true,
            })
            .afterClosed()
            .subscribe((updated: Client | null) => {
              if (updated) {
                this.submitOrder(this.payloadFromClient(updated, base));
              } else {
                this.loadingService.setLoading(false);
              }
            });
        } else {
          this.submitOrder(base); // crear de todas formas
        }
      });
  }

  /** Payload de la orden anclado a un cliente existente (tal cual / editado). */
  private payloadFromClient(client: Client, base: OrdenIngreso): OrdenIngreso {
    return {
      ...base,
      clientId: client.id ?? 0,
      name: client.name,
      rut: client.rut_raw,
      address: client.address,
      city: client.city,
      phone: client.phone,
      email: client.email,
      companyId: client.company_id ?? null,
      company_name: client.company?.name ?? '',
    };
  }

  /** Registro final de la orden (compartido por todos los caminos). */
  private submitOrder(value: OrdenIngreso): void {
    this.ordersApi.create(value).subscribe((clientAdded: Client) => {
      if (!clientAdded.orders?.length) return;
      const lastOrder = clientAdded.orders[clientAdded.orders.length - 1];
      this.ordenIngreso.date = new Date(clientAdded.orders[0].date);
      // El backend asigna code = ORD-xxxx; los registros legacy caen al id.
      this.ordenIngreso.code = (lastOrder as any).code ?? lastOrder.id;
      this.ordenIngreso.clientId = clientAdded.id;
      this.ordenIngreso.name = clientAdded.name;
      this.ordenIngreso.rut = clientAdded.rut_raw;
      this.ordenIngreso.city = clientAdded.city;
      this.ordenIngreso.phone = clientAdded.phone;
      this.ordenIngreso.address = clientAdded.address;
      this.ordenIngreso.description = lastOrder.description;
      this.ordenIngreso.observation = lastOrder.observation;
      this.ordenIngreso.date = lastOrder.date;
      this.ordenIngreso.status = lastOrder.status;
      this.ordenIngreso.company_name = clientAdded.company?.name ?? '';
      this.enablePDF = true;
      this.clearForm(true, true);
      const ifilterByRut = this.clients.findIndex(
        (user) => clientAdded.rut_raw === user.rut_raw && user.name === clientAdded.name
      );
      if (ifilterByRut === this.NOT_FOUND) {
        this.clients.unshift(clientAdded);
      }
      this.snackBarService.success(this.i18n.t('register.success'));
      this.lastClientAdded = this.ordenIngreso.clientId || 0;
      this.loadingService.setLoading(false);
    }, (err) => {
      // S1 (post-JD): mostrar el mensaje real del servidor (p. ej. el 400 del
      // RUT que no calza con la empresa) en vez del genérico de conexión.
      const msg =
        err?.error?.message ?? err?.message ?? this.i18n.t('register.connectionError');
      this.snackBarService.openSnackBar(Array.isArray(msg) ? msg.join(', ') : String(msg));
      this.loadingService.setLoading(false);
    });
  }

  clearAllDataForm(): void {
    this.clearForm(true, true);
    this.clearSearch();
    const inputClientEl = document.getElementById('input-client');
    if (inputClientEl) inputClientEl.focus();
    this.ordenIngreso.code = undefined;
    this.ordenIngreso.name = '';
    this.ordenIngreso.clientId = 0;
    this.ordenIngreso.date = undefined;
    this.ordenIngreso.status = '';
    this.enablePDF = false;
  }

  clearForm(clearRut: boolean, clearID?: boolean): void {
    this.form.setValue({
      name: '',
      address: '',
      city: '',
      phone: '',
      rut: clearRut ? '' : this.form.get('rut')?.value,
      email: '',
      has_company: false,
      company_name: '',
      companyId: null,
      description: '',
      observation: '',
      clientId: clearID ? '' : this.form.get('clientId')?.value,
    });
    this.form.get('company_name')?.disable();
    this.companyResults = [];
    this.branches = [];
    this.selectedCompany = undefined;
    this.unlockRut();
    this.lastClientAdded = 0;
    this.form.markAsUntouched();
  }

  hasCompanyChanged(checked: boolean): void {
    const branchControl = this.form.get('company_name');
    if (checked) {
      branchControl?.enable();
    } else {
      branchControl?.setValue('');
      branchControl?.disable();
      this.form.get('companyId')?.setValue(null);
      // Limpia también el RUT de la empresa: si quedaba pegado, un particular
      // se guardaba linkeado silenciosamente (Judgment Day A3/B1).
      this.form.get('rut')?.setValue('');
      this.companyResults = [];
      this.branches = [];
      this.selectedCompany = undefined;
      this.unlockRut();
    }
  }

  findByRut(): void {
    const rutFinded: string = String(this.form.get('rut')!.value)
      .toLowerCase()
      .trim()
      .replace(/[.-]/g, '');
    if (rutFinded.length < 3) return;
    this.loadingService.setLoading(true);
    this.clientsApi.findUserByRut(rutFinded).subscribe({
      next: (users) => {
        if (users.length === 0) {
          this.snackBarService.openSnackBar(this.i18n.t('register.noResults'));
          this.clearForm(false, true);
        } else {
          const existingIds = new Set(this.clients.map((c) => c.id));
          const newUsers = users.filter((u) => !existingIds.has(u.id));
          this.clients.push(...newUsers);
          if (users.length === 1) {
            this.fillFormFromClient(users[0]);
            const el = document.getElementById('id-description');
            if (el) el.focus();
          } else {
            this.openModalChoiceUser(rutFinded, users);
          }
        }
        this.loadingService.setLoading(false);
      },
      error: (err) => {
        console.error(err);
        this.loadingService.setLoading(false);
      },
    });
  }

  findByLastClient(): void {
    const clientAdded: Client[] = this.clients.filter((user) => user.id == this.lastClientAdded);
    if (clientAdded.length === 0) return;
    this.fillFormFromClient(clientAdded[0]);
    const descEl = document.getElementById('id-description');
    if (descEl) descEl.click();
  }

  /** Rellena el formulario con los datos de un cliente (helper DRY). */
  private fillFormFromClient(client: Client): void {
    const hasCompany = !!client.company_id;
    this.form.setValue({
      name: client.name,
      clientId: client.id,
      rut: client.rut_raw,
      email: client.email,
      address: client.address,
      city: client.city,
      phone: client.phone,
      has_company: hasCompany,
      company_name: client.company?.name ?? '',
      companyId: client.company_id ?? null,
      description: '',
      observation: '',
    });
    if (hasCompany) {
      this.form.get('company_name')?.enable();
    } else {
      this.form.get('company_name')?.disable();
    }
    // S2 (post-JD): empresa reusada — reconstruir selectedCompany desde la
    // relación para que el renombre refresque y selectBranch funcione.
    this.selectedCompany =
      hasCompany && client.company
        ? {
            id: client.company_id ?? client.company.id,
            name: client.company.name,
            rutNormalizado: client.company.rut_normalizado ?? client.rut_raw,
            branchCount: 0,
          }
        : undefined;
    this.branches = [];
    if (hasCompany && client.company_id) {
      // Mostrar sucursales hermanas para poder elegir otra (residual B8) y
      // bloquear el RUT: la sucursal comparte el de su empresa (S2).
      this.loadBranches(client.company_id);
      this.form.get('rut')?.disable();
      this.rutLocked = true;
    } else {
      this.unlockRut();
    }
  }

  openModalChoiceUser(rut: string, users: Client[]): void {
    this.modal
      .open(ModalChoiceClientComponent, {
        size: 'md',
        disableClose: true,
        data: { users: users, rut: rut },
      })
      .afterClosed()
      .subscribe((selected: Client) => {
        this.form.get('rut')!.markAsUntouched();
        if (selected) {
          this.fillFormFromClient(selected);
        }
        const el = document.getElementById('id-description');
        if (el) el.focus();
      });
  }

  descargarPDF(): void {
    this.pdfService.generatePDFServer(this.ordenIngreso);
  }

  obtenerMensajeError(control: AbstractControl): string {
    if (control?.hasError('required')) {
      return this.i18n.t('register.required');
    } else if (control?.hasError('email')) {
      return this.i18n.t('register.emailInvalid');
    } else if (control?.hasError('pattern')) {
      return this.i18n.t('register.numbersOnly');
    }
    return '';
  }
}
