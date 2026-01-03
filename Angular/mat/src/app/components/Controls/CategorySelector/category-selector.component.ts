import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  input,
  OnInit,
  Output,
} from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectListItemText } from 'src/app/models/preserts';
import { CommonService } from 'src/app/service/common.service';
import { MaterialModule } from 'src/app/material.module';


@Component({
  standalone: true,
  selector: 'app-category-selector',
  imports: [MaterialModule],
  templateUrl: "./category-selector.component.html",
  styleUrls: [ "./category-selector.component.css"]
})
export class CategorySelectorComponent implements OnInit {
  @Input() set selectedCategories(value: string) {
    if (value) {
      const selectedValues = value.split(',').map(v => v.trim());
      this.categoryControl.setValue(selectedValues);
    } else if (this.categories.length > 0) {
      // Если строка пустая, выбрать все категории
  // const allValues = this.categories.map(category => category.Value);
   //   this.categoryControl.setValue(allValues);
    }
  }
  
  @Output() categoriesChangeString = new EventEmitter<string>();

  categories: SelectListItemText[] = [];
  categoryControl = new FormControl();

  constructor(private categoryService: CommonService) { }

  ngOnInit() {
    this.categoryService.Categories().subscribe(data => {
      this.categories = data;

      // Если categories уже установлены в selectedCategories как пустая строка
    /*  if (!this.categoryControl.value || this.categoryControl.value.length === 0) {
        const allValues = this.categories.map(category => category.Value);
        this.categoryControl.setValue(allValues);
      }*/
    });

    this.categoryControl.valueChanges.subscribe(value => {
      
      this.categoriesChangeString.emit(value.join(','));
    });
  }


  onSelectionChange() {
    const selectedValues = this.categoryControl.value;  
    this.categoriesChangeString.emit(selectedValues.join(','));
  }
}
