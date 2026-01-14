import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { environment } from 'src/app/environment';

export interface FootprintFavoritePayload {
  params: FootPrintParameters;
  presetIndex?: number | null;
}

export interface FootprintFavorite extends FootprintFavoritePayload {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class FootprintFavoritesService {
  private favoritesSubject = new BehaviorSubject<FootprintFavorite[]>([]);
  private userId: string | null = null;
  private apiUrl = `${environment.apiUrl}/api/FootprintFavorites`;

  constructor(private http: HttpClient) {}

  get favorites$(): Observable<FootprintFavorite[]> {
    return this.favoritesSubject.asObservable();
  }

  setUserKey(userId?: string | null): void {
    const nextUserId = userId ?? null;
    if (this.userId === nextUserId) {
      return;
    }

    this.userId = nextUserId;
    if (!this.userId) {
      this.favoritesSubject.next([]);
      return;
    }

    this.loadFavorites();
  }

  getFavorites(): FootprintFavorite[] {
    return this.favoritesSubject.value;
  }

  addFavorite(name: string, payload: FootprintFavoritePayload): void {
    if (!this.userId) {
      return;
    }

    const trimmed = name.trim();
    const body = {
      name: trimmed || 'Избранное',
      params: this.normalizeParams(payload.params),
      presetIndex: payload.presetIndex ?? null,
    };

    this.http
      .post<FootprintFavorite>(this.apiUrl, body, { withCredentials: true })
      .subscribe({
        next: (favorite) => {
          const normalized = this.normalizeFavorite(favorite);
          this.favoritesSubject.next([
            ...this.favoritesSubject.value,
            normalized,
          ]);
        },
        error: (err) => {
          console.error('Failed to add footprint favorite', err);
        },
      });
  }

  renameFavorite(id: string, name: string): void {
    if (!this.userId) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    this.http
      .put<FootprintFavorite>(
        `${this.apiUrl}/${id}`,
        { name: trimmed },
        { withCredentials: true }
      )
      .subscribe({
        next: (favorite) => {
          const normalized = this.normalizeFavorite(favorite);
          const next = this.favoritesSubject.value.map((item) =>
            item.id === normalized.id ? normalized : item
          );
          this.favoritesSubject.next(next);
        },
        error: (err) => {
          console.error('Failed to rename footprint favorite', err);
        },
      });
  }

  deleteFavorite(id: string): void {
    if (!this.userId) {
      return;
    }

    this.http
      .delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .subscribe({
        next: () => {
          const next = this.favoritesSubject.value.filter(
            (favorite) => favorite.id !== id
          );
          this.favoritesSubject.next(next);
        },
        error: (err) => {
          console.error('Failed to delete footprint favorite', err);
        },
      });
  }

  private loadFavorites(): void {
    this.http
      .get<FootprintFavorite[]>(this.apiUrl, { withCredentials: true })
      .subscribe({
        next: (favorites) => {
          const normalized = (favorites ?? []).map((favorite) =>
            this.normalizeFavorite(favorite)
          );
          this.favoritesSubject.next(normalized);
        },
        error: (err) => {
          console.error('Failed to load footprint favorites', err);
          this.favoritesSubject.next([]);
        },
      });
  }

  private normalizeFavorite(favorite: FootprintFavorite): FootprintFavorite {
    return {
      ...favorite,
      params: this.normalizeParams(favorite.params),
      presetIndex: favorite.presetIndex ?? null,
    };
  }

  private normalizeParams(params: FootPrintParameters): FootPrintParameters {
    return {
      ...params,
      startDate: this.parseDate(params.startDate),
      endDate: this.parseDate(params.endDate),
    };
  }

  private parseDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? undefined : value;
    }
    const parsed = new Date(value as any);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
