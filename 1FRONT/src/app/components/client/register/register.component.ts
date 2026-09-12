import { Component, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { OrdenIngreso } from 'src/app/interface/ficha-tecnica';
import { ClientsApiService, CompanyInfo, DuplicateMatch } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { Client } from 'src/app/interface/client';
import { LoadingService } from 'src/app/services/loading.service';
import { ModalChoiceClientComponent } from '../modal-choice-client/modal-choice-client.component';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { PdfService } from 'src/app/services/pdf.service';
import { PdfComponent } from '../../shared/pdf/pdf.component';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutInputComponent } from '../../shared/rut-input/rut-input.component';
import {
  ModalCompanySimilarComponent,
  CompanySimilarResult,
} from '../modal-company-similar/modal-company-similar.component';
import {
  ModalDuplicateClientComponent,
  DuplicateClientResult,
} from '../modal-duplicate-client/modal-duplicate-client.component';
import { ModalEditClientComponent } from '../modal-edit-client/modal-edit-client.component';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, PdfComponent, NamePipe, RutInputComponent],
})
export class RegisterComponent {
  clients: Client[] = [];
  readonly NOT_FOUND = -1;
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
    description: new FormControl('', [Validators.required]),
    observation: new FormControl('', [Validators.required]),
  });
  enablePDF: boolean = false;
  /** Empresas inscritas para el autocomplete (Gatillante A). */
  companies: CompanyInfo[] = [];
  /** true cuando el RUT queda bloqueado con el de la empresa elegida. */
  rutLocked = false;

  private readonly loadingService = inject(LoadingService);
  private readonly modal = inject(ModalService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly snackBarService = inject(SnackbarService);
  private readonly pdfService = inject(PdfService);

  /** Labels legibles de los campos para el feedback de validación. */
  private readonly fieldLabels: Record<string, string> = {
    name: 'Cliente',
    rut: 'RUT',
    address: 'Dirección',
    city: 'Ciudad',
    phone: 'Teléfono',
    email: 'Correo',
    description: 'Descripción',
    observation: 'Observación',
  };

  constructor() {
    this.initData();
    this.loadCompanies();
  }

  private loadCompanies(): void {
    this.clientsApi.getCompanies().subscribe({
      next: (companies) => this.companies = companies ?? [],
      error: () => this.companies = [],
    });
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
    return status === 'En reparacion' ? 'En reparación' : status;
  }

  registerOrder(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      // Feedback explícito: antes esto retornaba en silencio y parecía que "no ocurría nada".
      const missing = Object.keys(this.form.controls)
        .filter((k) => this.form.get(k)?.invalid && !['has_company', 'company_name'].includes(k))
        .map((k) => this.fieldLabels[k] ?? k);
      this.snackBarService.openSnackBar(
        missing.length
          ? `Faltan campos obligatorios: ${missing.join(', ')}`
          : 'El formulario tiene errores de validación'
      );
      return;
    }

    const { has_company, ...payload } = this.form.getRawValue();
    payload.status = 'Pendiente';
    // Si has_company es false, company_name debe ir vacío.
    if (!has_company) {
      payload.company_name = '';
    }
    const value = payload as OrdenIngreso;
    if (!value.clientId) value.clientId = 0;

    this.loadingService.setLoading(true);

    // Gatillante C: chequeo anti-duplicados antes de registrar. Si el RUT está
    // bloqueado (empresa existente elegida) se omiten RUT y empresa de la
    // comparación — son compartidos por diseño entre sucursales — pero los
    // demás valores (nombre, dirección, teléfono, correo) igual se chequean.
    const dupInput: {
      name?: string;
      rut?: string;
      address?: string;
      phone?: string;
      email?: string;
      company_name?: string;
      has_company?: boolean;
    } = {
      name: value.name,
      address: value.address,
      phone: value.phone,
      email: value.email,
    };
    if (!this.rutLocked) {
      dupInput.rut = value.rut;
      dupInput.company_name = value.company_name;
      dupInput.has_company = has_company;
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
      company_name: client.company_name ?? '',
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
      this.ordenIngreso.company_name = clientAdded.company_name;
      this.enablePDF = true;
      this.clearForm(true, true);
      const ifilterByRut = this.clients.findIndex(
        (user) => clientAdded.rut_raw === user.rut_raw && user.name === clientAdded.name
      );
      if (ifilterByRut === this.NOT_FOUND) {
        this.clients.unshift(clientAdded);
      }
      this.snackBarService.success('Orden registrada correctamente');
      this.lastClientAdded = this.ordenIngreso.clientId || 0;
      this.loadingService.setLoading(false);
    }, () => {
      this.snackBarService.openSnackBar('Error. No fue posible conectarse con servidor');
      this.loadingService.setLoading(false);
    });
  }

  clearAllDataForm(): void {
    this.clearForm(true, true);
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
      description: '',
      observation: '',
      clientId: clearID ? '' : this.form.get('clientId')?.value,
    });
    this.form.get('company_name')?.disable();
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
      this.unlockRut();
    }
  }

  // ─── Flujo de empresa (Gatillante A y B) ────────────────────────────────

  /** Empresas que matchean el texto escrito (autocomplete). */
  get filteredCompanies(): CompanyInfo[] {
    const q = this.normalize(String(this.form.get('company_name')?.value ?? ''));
    if (!q) return this.companies;
    return this.companies.filter((c) => this.normalize(c.name).includes(q));
  }

  /** Muestra solo el nombre en el input al elegir una opción. */
  companyDisplay(company?: CompanyInfo): string {
    return company ? company.name : '';
  }

  /** Gatillante A: eligió una empresa inscrita → RUT se bloquea con el suyo. */
  onCompanySelected(event: MatAutocompleteSelectedEvent): void {
    const company = event.option.value as CompanyInfo;
    this.applyCompany(company);
  }

  private applyCompany(company: CompanyInfo): void {
    this.form.get('company_name')?.setValue(company.name);
    if (company.rut) {
      this.form.get('rut')?.setValue(company.rut);
      this.form.get('rut')?.disable();
      this.rutLocked = true;
    }
  }

  /** Desbloquea el RUT (empresa nueva o sin empresa). */
  private unlockRut(): void {
    this.form.get('rut')?.enable();
    this.rutLocked = false;
  }

  /**
   * Gatillante B: al salir del campo empresa con un nombre no inscrito,
   * busca parecidos; si hay, abre el modal para rectificar o crear nueva.
   */
  onCompanyBlur(): void {
    if (this.rutLocked) return;
    const typed = String(this.form.get('company_name')?.value ?? '').trim();
    const normTyped = this.normalize(typed);
    if (normTyped.length < 3) return;

    const exact = this.companies.some((c) => this.normalize(c.name) === normTyped);
    if (exact) return;

    const similar = this.companies
      .map((c) => ({ company: c, sim: this.similarity(typed, c.name) }))
      .filter((x) => x.sim >= 0.82)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 4)
      .map((x) => x.company);
    if (similar.length === 0) return;

    this.modal
      .open(ModalCompanySimilarComponent, {
        size: 'md',
        disableClose: true,
        data: { query: typed, companies: similar },
      })
      .afterClosed()
      .subscribe((res: CompanySimilarResult | undefined) => {
        if (res?.action === 'use' && res.company) {
          this.applyCompany(res.company);
        } else if (res?.action === 'create') {
          // Empresa nueva: el RUT queda libre para escribirlo.
          this.unlockRut();
        }
      });
  }

  /** Normaliza texto (minúsculas, sin acentos ni puntuación). */
  private normalize(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private similarity(a: string, b: string): number {
    const na = this.normalize(a);
    const nb = this.normalize(b);
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen === 0) return 1;
    return 1 - this.levenshtein(na, nb) / maxLen;
  }

  private levenshtein(a: string, b: string): number {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prevDiag = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = prev[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost);
        prevDiag = tmp;
      }
    }
    return prev[b.length];
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
          this.snackBarService.openSnackBar('Sin resultados');
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
    const hasCompany = !!client.company_name;
    this.form.setValue({
      name: client.name,
      clientId: client.id,
      rut: client.rut_raw,
      email: client.email,
      address: client.address,
      city: client.city,
      phone: client.phone,
      has_company: hasCompany,
      company_name: client.company_name || '',
      description: '',
      observation: '',
    });
    if (hasCompany) {
      this.form.get('company_name')?.enable();
    } else {
      this.form.get('company_name')?.disable();
    }
    this.unlockRut();
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
      return 'Este campo es requerido';
    } else if (control?.hasError('email')) {
      return 'El correo electrónico ingresado no es válido';
    } else if (control?.hasError('pattern')) {
      return 'Este campo solo puede contener números';
    }
    return '';
  }
}
