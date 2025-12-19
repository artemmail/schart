import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from 'src/app/environment';

@Injectable({
  providedIn: 'root',
})
export class ImageSaveService {
  constructor(private http: HttpClient) {}

  saveCanvasAsFile(
    canvas: HTMLCanvasElement,
    fileName: string,
    fileType: string = 'image/webp'
  ): Observable<string> {
    return new Observable<string>((observer) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {            
            const formData = new FormData();
            formData.append(fileType, blob, "fileName");

            from(
              this.http.post<string>(
                `${environment.apiUrl}/shots/upload?name=${fileName}`,
                formData,
                { responseType: 'text' as 'json' }
              )
            ).subscribe(
              (response) => {
                observer.next(response);
                observer.complete();
              },
              (error) => {
                observer.error(error);
              }
            );
          } else {
            observer.error('Blob creation failed');
          }
        },
        fileType,
        1
      );
    });
  }
}
