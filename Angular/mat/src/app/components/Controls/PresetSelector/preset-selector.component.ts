import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { SelectListItemText, SelectListItemNumber } from 'src/app/models/preserts';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';


@Component({ standalone: false, 
  selector: 'app-preset-selector',
  templateUrl: './preset-selector.component.html',
  styleUrls: ['./preset-selector.component.css']
})
export class PresetSelectorComponent implements OnInit {
  @Input() defaultpreset: number | null = null;
  @Output() presetChange = new EventEmitter<string>();

  presetControl = new FormControl('');
  presets$: Observable<SelectListItemNumber[]>;

  constructor(private commonService: ChartSettingsService) {}

  getSelectedpreset(): string {
    return this.presetControl.value;
  }

  reload(val:number)
  {
    //if(val)
    this.defaultpreset = val;
    this.presets$ = this.commonService.getPresets(); 
    this.presets$.subscribe((presets) => {
    
      if (presets && presets.length > 0) {
        const initialpreset = this.defaultpreset || presets[0].Value;
        
        this.presetControl.setValue(initialpreset.toString());
        this.presetChange.emit(initialpreset.toString());
      }
    });
  }

  ngOnInit(): void {
    this.presets$ = this.commonService.getPresets();

    // Установить начальное значение для presetControl
    this.presets$.subscribe((presets) => {
      
      if (presets && presets.length > 0) {
        const initialpreset = this.defaultpreset || presets[0].Value;
        
        this.presetControl.setValue(initialpreset.toString());
        this.presetChange.emit(initialpreset.toString());
      }
    });

    // Извещать об изменениях выбора рынка
    this.presetControl.valueChanges.subscribe(value => {
      this.presetChange.emit(value);
    });
  }
}