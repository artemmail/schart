import { Component, AfterViewInit, Output, EventEmitter, ViewChild, ElementRef, Input } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { NgxMaterialTimepickerComponent } from 'ngx-material-timepicker';
import { removeUTC, removeUTCd } from 'src/app/service/FootPrint/Formating/formatting.service';

@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.css'],
  standalone:false,
})
export class DateRangePickerComponent implements AfterViewInit {
  @Output() selectionChange = new EventEmitter<{ start: Date | null, end: Date | null }>();
  @Input() enableSetTime: boolean = false;  // Новый параметр для включения setTime

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
      this.timeRange.controls['startTime'].setValue('00:00');
      this.timeRange.controls['endTime'].setValue('23:59');
    }

    this.updateSelection();
  }

  toggleTimeSelection() {
    this.setTime = !this.setTime;

    if (!this.setTime) {
      this.timeRange.controls['startTime'].setValue('00:00');
      this.timeRange.controls['endTime'].setValue('23:59');
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
    if(!this.enableSetTime)
      return false;
    const startDate = this.range.controls['start'].value;
    const endDate = this.range.controls['end'].value;
    return startDate && endDate && startDate.toDateString() === endDate.toDateString();
  }

  setDatesRange(start: Date | null, end: Date | null) {
    if (start) {
      this.startInput.nativeElement.value = this.dateAdapter.format(start, 'DD.MM.YYYY');
    }
    if (end) {
      this.endInput.nativeElement.value = this.dateAdapter.format(end, 'DD.MM.YYYY');
    }
    this.range.controls['start'].setValue(start);
    this.range.controls['end'].setValue(end);
  
    if (start && end) {
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < 1 && diffMs !== 0) {
        this.setTime = true;
        // Инициализируем поля времени из дат
        const startHours = start.getHours().toString().padStart(2, '0');
        const startMinutes = start.getMinutes().toString().padStart(2, '0');
        const endHours = end.getHours().toString().padStart(2, '0');
        const endMinutes = end.getMinutes().toString().padStart(2, '0');
        this.timeRange.controls['startTime'].setValue(`${startHours}:${startMinutes}`);
        this.timeRange.controls['endTime'].setValue(`${endHours}:${endMinutes}`);
      } else {
        this.setTime = false;
        this.timeRange.controls['startTime'].setValue('00:00');
        this.timeRange.controls['endTime'].setValue('23:59');
      }
    } else {
      this.setTime = false;
      this.timeRange.controls['startTime'].setValue('00:00');
      this.timeRange.controls['endTime'].setValue('23:59');
    }
  }

  getStart(): Date | null {
    const date = (this.range.controls['start'].value);
    if (date) {
      const dateCopy = new Date(date);
      if (
        this.setTime &&
        this.isSameDay() &&
        (this.timeRange.controls['startTime'].value !== '00:00' ||
          this.timeRange.controls['endTime'].value !== '23:59')
      ) {
        const startTime = this.timeRange.controls['startTime'].value;
        const [hours, minutes] = startTime.split(':').map(Number);
        dateCopy.setHours(hours, minutes, 0, 0);
      }
      return dateCopy;
    }
    return null;
  }

  getEnd(): Date | null {
    const date = (this.range.controls['end'].value);
    if (date) {
      const dateCopy = new Date(date);
      if (
        this.setTime &&
        this.isSameDay() &&
        (this.timeRange.controls['startTime'].value !== '00:00' ||
          this.timeRange.controls['endTime'].value !== '23:59')
      ) {
        const endTime = this.timeRange.controls['endTime'].value;
        const [hours, minutes] = endTime.split(':').map(Number);
        dateCopy.setHours(hours, minutes, 0, 0);
      }
      return dateCopy;
    }
    return null;
  }

  onStartTimeChange(time: string) {
    const formattedTime = this.formatTimeTo24(time);
    this.timeRange.controls['startTime'].setValue(formattedTime);
    this.startTimePickerRef?.close();
    this.updateSelection();
  }

  onEndTimeChange(time: string) {
    const formattedTime = this.formatTimeTo24(time);
    this.timeRange.controls['endTime'].setValue(formattedTime);
    this.endTimePickerRef?.close();
    this.updateSelection();
  }

  formatTimeTo24(time: string): string {
    const timeParts = time.split(' ');
    let [hoursMinutes] = timeParts;
    const ampm = timeParts[1];

    let [hours, minutes] = hoursMinutes.split(':').map(Number);

    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
