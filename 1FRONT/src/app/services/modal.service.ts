import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/overlay';

/**
 * Tokens de tamaño de diálogo (alineados a los anchos dominantes ya en uso):
 *  - sm:   confirmaciones, deletes, QR (≈400-420px)
 *  - md:   formularios cortos, detalles, status (≈500-560px)
 *  - lg:   formularios de edición (≈720px)
 *  - xl:   paneles con tabla de datos (≈1100px)
 *  - auto: tablas anchas de columnas dinámicas (width auto + tope 92vw)
 *  - full: visores de imagen (85% del viewport)
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'auto' | 'full';

const SIZE_MAP: Record<ModalSize, { width: string; maxWidth?: string }> = {
  sm: { width: '90vw', maxWidth: '420px' },
  md: { width: '90vw', maxWidth: '560px' },
  lg: { width: '90vw', maxWidth: '720px' },
  xl: { width: '95vw', maxWidth: '1100px' },
  auto: { width: 'auto', maxWidth: '92vw' },
  full: { width: '85%' },
};

export interface ModalOptions<D = unknown> {
  size?: ModalSize;
  data?: D;
  /** MatDialog default es false; los flujos destructivos pasan true. */
  disableClose?: boolean;
  maxHeight?: string;
}

/**
 * Punto único de apertura de diálogos: estandariza dimensiones y opciones
 * en lugar de que cada call site invente su combinación de width/maxWidth.
 */
@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly dialog = inject(MatDialog);

  /**
   * R queda como `any`: los call sites tipan el resultado en su propio
   * subscribe, y tiparlo acá obligaría a repetir el tipo en cada apertura.
   */
  open<T, D = unknown>(
    component: ComponentType<T>,
    options: ModalOptions<D> = {},
  ): MatDialogRef<T, any> {
    const { size = 'md', data, disableClose = false, maxHeight = '90vh' } = options;
    const dims = SIZE_MAP[size];
    return this.dialog.open(component, {
      width: dims.width,
      maxWidth: dims.maxWidth,
      maxHeight,
      data,
      disableClose,
    });
  }
}
