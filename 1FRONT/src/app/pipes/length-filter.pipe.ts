import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lengthFilter',
  standalone: true
})
export class LengthFilterPipe implements PipeTransform {
  transform(value: string): number {
    switch(value){
      case 'code':
        return 8;
        case 'rut':
        return 14;
        case 'name':
        return 20;
        case 'address':
        return 50;
        default:return 10;
    }
  }

}
