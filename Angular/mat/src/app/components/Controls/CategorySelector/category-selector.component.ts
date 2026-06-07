import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  categoryControl = new FormControl<string[]>([]);

  constructor(
    private categoryService: CommonService,
    private destroyRef: DestroyRef
  ) { }

  ngOnInit() {
    this.categoryService.Categories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
      this.categories = data;

      // Если categories уже установлены в selectedCategories как пустая строка
    /*  if (!this.categoryControl.value || this.categoryControl.value.length === 0) {
        const allValues = this.categories.map(category => category.Value);
        this.categoryControl.setValue(allValues);
      }*/
    });

    this.categoryControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
      this.categoriesChangeString.emit((value ?? []).join(','));
    });
  }


  onSelectionChange() {
    const selectedValues = this.categoryControl.value ?? [];
    this.categoriesChangeString.emit(selectedValues.join(','));
  }
}
