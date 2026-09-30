import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../environment';
import { normalizeRelatedAssetsResponse, RelatedAssetsResponse } from '../models/related-assets';
export type { RelatedAssetItem, RelatedAssetsResponse } from '../models/related-assets';

@Injectable({ providedIn: 'root' })
export class RelatedAssetsService {
  constructor(private readonly http: HttpClient) {}

  getTree(ticker: string): Observable<RelatedAssetsResponse> {
    return this.http.get<unknown>(
      `${environment.apiUrl}/api/related-assets/${encodeURIComponent(ticker)}`
    ).pipe(map(normalizeRelatedAssetsResponse));
  }
}
