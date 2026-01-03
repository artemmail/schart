import {
  Component,
  AfterViewInit,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  Input,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { NgxMaterialTimepickerComponent } from 'ngx-material-timepicker';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.css'],
  standalone: true,
  imports: [MaterialModule, NgxMaterialTimepickerModule],
})
export class DateRangePickerComponent implements AfterViewInit {
  @Output() selectionChange = new EventEmitter<{ start: Date | null; end: Date | null }>();
  @Input() enableSetTime: boolean = false;

  @ViewChild('startInput') startInput!: ElementRef<HTMLInputElement>;
  @ViewChild('endInput') endInput!: ElementRef<HTMLInputElement>;
  @ViewChild('startTimePicker') startTimePickerRef!: NgxMaterialTimepickerComponent;
  @ViewChild('endTimePicker') endTimePickerRef!: NgxMaterialTimepickerComponent;

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  timeRange = new FormGroup({
    startTime: new FormControl<string>('00:00'),
    endTime: new FormControl<string>('23:59'),
  });

  setTime: boolean = false;

  // --- internal guards for ngx-material-timepicker sync quirks ---
  private ensureOrderTimer: any = null;
  private suppressEnsureOrder = false;

  constructor(private dateAdapter: DateAdapter<Date>) {}

  ngAfterViewInit() {}

  dateChanged(event: { value: Date }, isStartDate: boolean) {
    const date = event.value;

    if (isStartDate) {
      this.setDatesRange(date, this.getEnd());
    } else {
      this.setDatesRange(this.getStart(), date);
    }

    if (!this.isSameDay()) {
      this.setTime = false;
      this.timeRange.controls['startTime'].setValue('00:00', { emitEvent: false });
      this.timeRange.controls['endTime'].setValue('23:59', { emitEvent: false });
    }

    this.updateSelection();
  }

  toggleTimeSelection() {
    this.setTime = !this.setTime;

    if (!this.setTime) {
      this.timeRange.controls['startTime'].setValue('00:00', { emitEvent: false });
      this.timeRange.controls['endTime'].setValue('23:59', { emitEvent: false });
    }

    this.updateSelection();
  }

  updateSelection() {
    const startDate = this.getStart();
    const endDate = this.getEnd();

    if (startDate && endDate) {
      this.selectionChange.emit({ start: startDate, end: endDate });
    }
  }

  isSameDay(): boolean {
    if (!this.enableSetTime) return false;

    const startDate = this.range.controls['start'].value;
    const endDate = this.range.controls['end'].value;
    return !!(startDate && endDate && startDate.toDateString() === endDate.toDateString());
  }

  setDatesRange(start: Date | null, end: Date | null) {
    if (start) {
      this.startInput.nativeElement.value = this.dateAdapter.format(start, 'DD.MM.YYYY');
    }
    if (end) {
      this.endInput.nativeElement.value = this.dateAdapter.format(end, 'DD.MM.YYYY');
    }

    this.range.controls['start'].setValue(start, { emitEvent: false });
    this.range.controls['end'].setValue(end, { emitEvent: false });

    if (start && end) {
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // если диапазон меньше суток (но не равен 0) — включаем setTime и инициализируем время из Date
      if (diffDays < 1 && diffMs !== 0) {
        this.setTime = true;

        const startHours = start.getHours().toString().padStart(2, '0');
        const startMinutes = start.getMinutes().toString().padStart(2, '0');
        const endHours = end.getHours().toString().padStart(2, '0');
        const endMinutes = end.getMinutes().toString().padStart(2, '0');

        this.timeRange.controls['startTime'].setValue(`${startHours}:${startMinutes}`, {
          emitEvent: false,
        });
        this.timeRange.controls['endTime'].setValue(`${endHours}:${endMinutes}`, {
          emitEvent: false,
        });
      } else {
        this.setTime = false;
        this.timeRange.controls['startTime'].setValue('00:00', { emitEvent: false });
        this.timeRange.controls['endTime'].setValue('23:59', { emitEvent: false });
      }
    } else {
      this.setTime = false;
      this.timeRange.controls['startTime'].setValue('00:00', { emitEvent: false });
      this.timeRange.controls['endTime'].setValue('23:59', { emitEvent: false });
    }
  }

  getStart(): Date | null {
    const date = this.range.controls['start'].value;
    if (!date) return null;

    const dateCopy = new Date(date);

    if (
      this.setTime &&
      this.isSameDay() &&
      (this.timeRange.controls['startTime'].value !== '00:00' ||
        this.timeRange.controls['endTime'].value !== '23:59')
    ) {
      const startTime = this.timeRange.controls['startTime'].value || '00:00';
      const [hours, minutes] = startTime.split(':').map(Number);
      dateCopy.setHours(hours, minutes, 0, 0);
    }

    return dateCopy;
  }

  getEnd(): Date | null {
    const date = this.range.controls['end'].value;
    if (!date) return null;

    const dateCopy = new Date(date);

    if (
      this.setTime &&
      this.isSameDay() &&
      (this.timeRange.controls['startTime'].value !== '00:00' ||
        this.timeRange.controls['endTime'].value !== '23:59')
    ) {
      const endTime = this.timeRange.controls['endTime'].value || '23:59';
      const [hours, minutes] = endTime.split(':').map(Number);
      dateCopy.setHours(hours, minutes, 0, 0);
    }

    return dateCopy;
  }

  onStartTimeChange(time: string) {
    const formattedTime = this.formatTimeTo24(time);

    // Ставим выбранное время без лишних эмитов.
    this.timeRange.controls['startTime'].setValue(formattedTime, { emitEvent: false });

    // Закрываем оверлей (если нужно)
    this.startTimePickerRef?.close();

    // ВАЖНО: выравниваем порядок после того, как таймпикер допишет свои значения при закрытии
    this.scheduleEnsureTimeOrder();
  }

  onEndTimeChange(time: string) {
    const formattedTime = this.formatTimeTo24(time);

    this.timeRange.controls['endTime'].setValue(formattedTime, { emitEvent: false });
    this.endTimePickerRef?.close();

    this.scheduleEnsureTimeOrder();
  }

  private scheduleEnsureTimeOrder() {
    if (this.suppressEnsureOrder) return;

    if (this.ensureOrderTimer) {
      clearTimeout(this.ensureOrderTimer);
      this.ensureOrderTimer = null;
    }

    this.ensureOrderTimer = setTimeout(() => {
      this.ensureOrderTimer = null;

      this.ensureTimeOrder();
      this.updateSelection();
    }, 0);
  }

  ensureTimeOrder() {
    if (this.suppressEnsureOrder) return;

    const startTime = this.timeRange.controls['startTime'].value;
    const endTime = this.timeRange.controls['endTime'].value;

    if (!startTime || !endTime) return;

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    if (startTotalMinutes > endTotalMinutes) {
      // ngx-material-timepicker может ещё раз записать значение в formControl при закрытии.
      // Поэтому делаем swap с подавлением и даём ему “закончить” в следующий тик.
      this.suppressEnsureOrder = true;

      this.timeRange.patchValue(
        { startTime: endTime, endTime: startTime },
        { emitEvent: false }
      );

      setTimeout(() => {
        this.suppressEnsureOrder = false;
      }, 0);
    }
  }

  formatTimeTo24(time: string): string {
    const timeParts = time.split(' ');
    const hoursMinutes = timeParts[0] || '00:00';
    const ampm = timeParts[1];

    let [hours, minutes] = hoursMinutes.split(':').map(Number);

    if (ampm) {
      const ap = ampm.toLowerCase();
      if (ap === 'pm' && hours < 12) {
        hours += 12;
      } else if (ap === 'am' && hours === 12) {
        hours = 0;
      }
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
