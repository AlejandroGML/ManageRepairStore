import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'name',
  standalone: true
})
export class NamePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return value;
    try {
      return value.charAt(0).toUpperCase() + value.slice(1); 
    } catch (error) {
      console.error(error);
      return '';
    }
  }

}
