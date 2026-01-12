import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';

export interface FootprintFavoritePayload {
  params: FootPrintParameters;
  presetIndex?: number | null;
}

export interface FootprintFavorite extends FootprintFavoritePayload {
  id: string;
  name: string;
}

interface StoredFootprintFavorite extends Omit<FootprintFavorite, 'params'> {
  params: Omit<FootPrintParameters, 'startDate' | 'endDate'> & {
    startDate?: string | null;
    endDate?: string | null;
  };
}

@Injectable({
  providedIn: 'root',
})
export class FootprintFavoritesService {
  private favoritesSubject = new BehaviorSubject<FootprintFavorite[]>([]);
  private userKey = 'guest';

  constructor() {
    this.load();
  }

  get favorites$(): Observable<FootprintFavorite[]> {
    return this.favoritesSubject.asObservable();
  }

  setUserKey(userId?: string | null): void {
    const nextKey = userId ? `user:${userId}` : 'guest';
    if (this.userKey === nextKey) {
      return;
    }
    this.userKey = nextKey;
    this.load();
  }

  getFavorites(): FootprintFavorite[] {
    return this.favoritesSubject.value;
  }

  addFavorite(name: string, payload: FootprintFavoritePayload): FootprintFavorite {
    const trimmed = name.trim();
    const favorite: FootprintFavorite = {
      id: this.createId(),
      name: trimmed || 'Избранное',
      params: this.normalizeParams(payload.params),
      presetIndex: payload.presetIndex ?? null,
    };

    const next = [...this.favoritesSubject.value, favorite];
    this.persist(next);
    return favorite;
  }

  renameFavorite(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const next = this.favoritesSubject.value.map((favorite) =>
      favorite.id === id ? { ...favorite, name: trimmed } : favorite
    );
    this.persist(next);
  }

  deleteFavorite(id: string): void {
    const next = this.favoritesSubject.value.filter(
      (favorite) => favorite.id !== id
    );
    this.persist(next);
  }

  private storageKey(): string {
    return `footprintFavorites:${this.userKey}`;
  }

  private load(): void {
    const raw = window.localStorage.getItem(this.storageKey());
    if (!raw) {
      this.favoritesSubject.next([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredFootprintFavorite[];
      const favorites = Array.isArray(parsed)
        ? parsed.map((favorite) => this.fromStored(favorite))
        : [];
      this.favoritesSubject.next(favorites);
    } catch (err) {
      console.error('Failed to parse footprint favorites', err);
      this.favoritesSubject.next([]);
    }
  }

  private persist(favorites: FootprintFavorite[]): void {
    this.favoritesSubject.next(favorites);
    const serialized = favorites.map((favorite) =>
      this.toStored(favorite)
    );
    window.localStorage.setItem(this.storageKey(), JSON.stringify(serialized));
  }

  private toStored(favorite: FootprintFavorite): StoredFootprintFavorite {
    return {
      id: favorite.id,
      name: favorite.name,
      presetIndex: favorite.presetIndex ?? null,
      params: {
        ...favorite.params,
        startDate: this.toIsoString(favorite.params.startDate),
        endDate: this.toIsoString(favorite.params.endDate),
      },
    };
  }

  private fromStored(favorite: StoredFootprintFavorite): FootprintFavorite {
    return {
      id: favorite.id,
      name: favorite.name,
      presetIndex: favorite.presetIndex ?? null,
      params: this.normalizeParams({
        ...favorite.params,
        startDate: this.parseDate(favorite.params.startDate),
        endDate: this.parseDate(favorite.params.endDate),
      }),
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

  private toIsoString(value: unknown): string | undefined {
    const date = this.parseDate(value);
    return date ? date.toISOString() : undefined;
  }

  private createId(): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${Date.now().toString(36)}-${rand}`;
  }
}
