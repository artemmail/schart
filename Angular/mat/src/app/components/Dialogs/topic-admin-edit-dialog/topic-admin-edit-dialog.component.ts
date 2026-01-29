import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';

export interface TopicAdminEditDialogData {
  Hide: boolean;
  Author: string;
  Date: Date;
}

@Component({
  standalone: true,
  selector: 'app-topic-admin-edit-dialog',
  imports: [MaterialModule],
  templateUrl: './topic-admin-edit-dialog.component.html',
  styleUrls: ['./topic-admin-edit-dialog.component.css']
})
export class TopicAdminEditDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TopicAdminEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TopicAdminEditDialogData
  ) {
    const initialDate = data?.Date ? new Date(data.Date) : new Date();
    this.form = this.fb.group({
      hide: [data?.Hide ?? false],
      author: [data?.Author ?? '', Validators.required],
      date: [initialDate, Validators.required]
    });
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
