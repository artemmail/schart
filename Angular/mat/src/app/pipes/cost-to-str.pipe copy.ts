import { Pipe, PipeTransform } from '@angular/core';
import { drob } from '../service/FootPrint/utils';

@Pipe({
  name: 'costToStr',
})
export class CostToStrPipe implements PipeTransform {
  transform(value: number, sh: number = 2): number {
    return drob(value, sh);
  }
}
