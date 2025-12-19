import { Component, HostListener, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { SpinnerOverlayComponent } from '../../Controls/spinner-overlay-component/spinner-overlay-component.component';

import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ImageSaveService } from 'src/app/service/image-save.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'image-uploader',
  templateUrl: './image-uploader.component.html',
  styleUrls: ['./image-uploader.component.css'],
  standalone:false,
})
export class ImageUploaderComponent {
  filename: string | null = null;
  filetype: string | null = 'image/webp';
  name: string = '';
  targetWidth: number = 0;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private ngZone: NgZone,
    private imageSaveService: ImageSaveService,
    private titleService: Title
  ) {
    titleService.setTitle("Опубликовать картинку");
    this.resetForm();
  }

  resetForm() {
    this.filename = null;
    this.filetype = 'image/webp';
    this.name = '';
    this.targetWidth = 0;
  }

  copy(): void {
    navigator.clipboard.writeText(this.filename!).then(
      () => {
        console.log('Async: Copying to clipboard was successful!');
      },
      (err) => {
        console.error('Async: Could not copy text: ', err);
      }
    );
  }

  chooseFile(): void {
    document.getElementById('fileUpload')?.click();
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files![0];
    if (file && file.type.match('image.*')) {
      this.displayImage(file);
    }
  }

  handleDragOver(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  handleDrop(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const file = event.dataTransfer!.files[0];
    if (file && file.type.match('image.*')) {
      this.displayImage(file);
    }
  }

  @HostListener('document:paste', ['$event'])
  handlePaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (items) {
      Array.from(items).forEach((item) => {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            this.displayImage(file);
          }
        }
      });
    }
  }

  displayImage(file: File): void {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.id = 'previewImage';
      img.style.maxWidth = '100%';

      const that = this;

      img.onload = function() {
        // Используем оригинальные размеры изображения, а не визуальные.
        that.showInput(img.naturalWidth);  // Используем naturalWidth для оригинальной ширины
      };

      const dropZone = document.getElementById('dropZone')!;
      while (dropZone.firstChild) {
        dropZone.removeChild(dropZone.lastChild!);
      }
      dropZone.appendChild(img);
    };
    reader.readAsDataURL(file);
  }

  showInput(defaultValue: number): void {
    this.targetWidth = defaultValue;
    document.getElementById('inputContainer')!.style.display = 'block';
  }

  uploadImage(event: Event): void {
    event.preventDefault();
    const dialogRef = this.dialog.open(SpinnerOverlayComponent, {
      disableClose: true,
    });

    try {
      const canvas = document.createElement('canvas');
      const img = document.getElementById('previewImage') as HTMLImageElement;
      const ctx = canvas.getContext('2d')!;

      // Используем оригинальные размеры изображения для расчёта пропорций
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      if (
        isNaN(this.targetWidth) ||
        this.targetWidth > naturalWidth ||
        this.targetWidth < 64
      ) {
        this.targetWidth = naturalWidth;
      }

      const scaleFactor = this.targetWidth / naturalWidth;
      canvas.width = this.targetWidth;
      canvas.height = naturalHeight * scaleFactor;

      ctx.drawImage(img, 0, 0, this.targetWidth, canvas.height);

      this.imageSaveService.saveCanvasAsFile(
        canvas,
        this.name,
        this.filetype
      ).pipe(
        catchError(error => {
          alert('Error saving image!' + error);
          dialogRef.close();
          return of(null);
        })
      ).subscribe((response) => {
        if (response) {
          this.ngZone.run(() => {
            this.filename = response;
            dialogRef.close();
          });
        }
      });

    } catch (error) {
      alert('Error saving image!' + error);
      dialogRef.close();
    }
  }
}
