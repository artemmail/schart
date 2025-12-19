import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthEventService {
  private authStateChange = new Subject<boolean>();
  
  authStateChange$ = this.authStateChange.asObservable();

  emitAuthStateChange(isSignedIn: boolean) {
    this.authStateChange.next(isSignedIn);
  }
}