import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ImageSaveService } from 'src/app/service/image-save.service';


@Component({
  standalone: false,
  selector: 'app-save-image-dialog',
  templateUrl: './save-image-dialog.component.html',
})
export class SaveImageDialogComponent {
  form: FormGroup;
  fileUrl: string | null = null;
  fileName: string = '';
  saving: boolean = false;
  linkCopied: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<SaveImageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { canvas: HTMLCanvasElement },
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private imageSaveService: ImageSaveService
  ) {
    this.form = this.fb.group({
      fileType: ['image/webp', Validators.required],
      fileName: ['', Validators.required]
    });
  }

  onSaveClick(): void {
    const { fileName, fileType } = this.form.value;
    this.saving = true;
    this.imageSaveService.saveCanvasAsFile(this.data.canvas, fileName, fileType).subscribe(
      (response) => {
        this.fileUrl = response;
        this.fileName = fileName;
        this.saving = false;
      },
      (error) => {
        alert('Error saving image: ' + error);
        this.saving = false;
      }
    );
  }

  onCopyLinkClick(): void {
    if (this.fileUrl) {
      navigator.clipboard.writeText(this.fileUrl).then(() => {
        this.linkCopied = true;
      });
    }
  }

  onOkClick(): void {
    this.dialogRef.close();
  }
}
