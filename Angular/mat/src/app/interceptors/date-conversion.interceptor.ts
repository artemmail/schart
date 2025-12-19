import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isDateField } from './date-field.decorator';

@Injectable()
export class DateConversionInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      map(event => {
        if (event instanceof HttpResponse) {
          event = event.clone({ body: this.convertDates(event.body) });
        }
        return event;
      })
    );
  }

  private convertDates(body: any): any {
    
    if (body === null || body === undefined || typeof body !== 'object') {
      return body;
    }

    if (Array.isArray(body)) {
      return body.map(item => this.convertDates(item));
    }

    const prototype = Object.getPrototypeOf(body);

    for (const key of Object.keys(body)) {
      const value = body[key];
      if (isDateField(prototype, key)) {
        
        body[key] = new Date(value);
      } else if (typeof value === 'object') {
        body[key] = this.convertDates(value);
      }
    }
    return body;
  }
}
