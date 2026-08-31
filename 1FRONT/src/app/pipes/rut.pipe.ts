import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rut',
  standalone: true
})
export class RutPipe implements PipeTransform {

  transform(value: string, ...args: string[]): string {
   return this.formatRut(value);
  }

  private formatRut(rut:string):string{
    rut = rut.replace(/[^0-9kK]/g, '').toLowerCase();
    if (rut.length < 2) return rut;
    let cleanRut = rut.slice(0, -1);
    let verifierDigit = rut.slice(-1);
    let formattedRut = '';
    while (cleanRut.length > 3) {
      formattedRut = `.${cleanRut.slice(-3)}${formattedRut}`;
      cleanRut = cleanRut.slice(0, -3);
    }
    return `${cleanRut}${formattedRut}-${verifierDigit}`;
  }
}
