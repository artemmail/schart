import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/app/environment';
import { SelectListItemText } from 'src/app/models/preserts';

@Injectable({
  providedIn: 'root'
})
export class TickerService {

  private baseUrl = `${environment.apiUrl}/api/common`;

  constructor(private http: HttpClient) { }

  findByMask(mask: string, count: number = 20): Observable<SelectListItemText[]> {
    const params = new HttpParams()
      .set('mask', mask)
      .set('count', count.toString());

    return this.http.get<any[]>(`${this.baseUrl}/Autocomplete`, { params })
      .pipe(
        catchError(() => of([])) // Возвращает пустой массив в случае ошибки
      );
  }
}