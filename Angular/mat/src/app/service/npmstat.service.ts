import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { formatDate } from '@angular/common';

interface DownloadData {
  downloads: number;
  day: string;
}

interface ApiResponse {
  start: string;
  end: string;
  package: string;
  downloads: DownloadData[];
}

@Injectable({
  providedIn: 'root'
})
export class NpmStatService {

  private apiUrl = 'https://api.npmjs.org/downloads/range';

  constructor(private http: HttpClient) { }

  getDownloadStats(startDate: Date, endDate: Date, packageName: string): Observable<DownloadData[]> {
    const formattedStartDate = formatDate(startDate, 'yyyy-MM-dd', 'en');
    const formattedEndDate = formatDate(endDate, 'yyyy-MM-dd', 'en');
    const url = `${this.apiUrl}/${formattedStartDate}:${formattedEndDate}/${packageName}`;
    return this.http.get<ApiResponse>(url).pipe(
      map(response => response.downloads.filter(download => download.downloads > 0))
    );
  }
}
