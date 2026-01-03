import { Component, Input } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-arrow-display',
  imports: [MaterialModule],
  templateUrl: './arrow-display.component.html',
  styleUrls: ['./arrow-display.component.css']
})
export class ArrowDisplayComponent {
  @Input() value: number;

  getRotation(value: number): string {
    const angle = -value * 25; // каждое значение умножаем на 15 градусов
    return `rotate(${angle}deg)`;
  }

  getColor(value: number): string {
    if( value == 0) return  'black';
    return value < 0 ? '#d75442' : '#6ba583';
  }
}
