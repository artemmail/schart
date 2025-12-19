import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environment';
import { UserTopic } from 'src/app/models/UserTopic';

@Injectable({
  providedIn: 'root'
})
export class UserTopicsService {
 

  constructor(private http: HttpClient) { }


}