import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/app/environment';

export interface FootprintFavoritesBoardLayout {
  columns: number;
  rows: number;
}

export interface FootprintFavoritesBoardConfig {
  favoriteIds?: string[];
  layout?: Record<string, FootprintFavoritesBoardLayout>;
}

interface FootprintFavoritesBoardResponse {
  config?: FootprintFavoritesBoardConfig;
}

@Injectable({
  providedIn: 'root',
})
export class FootprintFavoritesBoardService {
  private apiUrl = `${environment.apiUrl}/api/FootprintFavoritesBoard`;

  constructor(private http: HttpClient) {}

  getConfig(): Observable<FootprintFavoritesBoardConfig> {
    return this.http
      .get<FootprintFavoritesBoardResponse>(this.apiUrl, {
        withCredentials: true,
      })
      .pipe(map((response) => response?.config ?? {}));
  }

  saveConfig(config: FootprintFavoritesBoardConfig): Observable<void> {
    return this.http.put<void>(
      this.apiUrl,
      { config },
      { withCredentials: true }
    );
  }
}
