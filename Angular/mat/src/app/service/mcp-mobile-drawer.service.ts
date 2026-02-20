import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class McpMobileDrawerService {
  private readonly toggleRequestSource = new Subject<void>();

  get toggleRequested$(): Observable<void> {
    return this.toggleRequestSource.asObservable();
  }

  requestToggle(): void {
    this.toggleRequestSource.next();
  }
}
