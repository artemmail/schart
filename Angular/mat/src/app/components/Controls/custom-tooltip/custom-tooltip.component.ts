import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-custom-tooltip',
  templateUrl: './custom-tooltip.component.html',
  styleUrls: ['./custom-tooltip.component.css']
})
export class CustomTooltipComponent {
  @Input() data: any;
}