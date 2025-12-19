import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Topic, Comment, UserTopic, PaginatedResult, UserTopicText } from '../models/UserTopic';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  constructor(private http: HttpClient) {}

  getUserTopics(page: number, pageSize: number): Observable<PaginatedResult<UserTopic>> {
    const url = `${environment.apiUrl}/api/topics/page?page=${page}&pageSize=${pageSize}`;
    return this.http.get<PaginatedResult<UserTopic>>(url);
  }
  
  getUserTopics2(page: number, pageSize: number): Observable<PaginatedResult<UserTopicText>> {
    const url = `${environment.apiUrl}/api/topics/topic?page=${page}&pageSize=${pageSize}`;
    
    return this.http.get<PaginatedResult<UserTopicText>>(url).pipe(
      map(response => {
        // Преобразуем дату в объект Date для каждого элемента в массиве
        response.Items = response.Items.map(topic => {
          return {
            ...topic,
            Date: new Date(topic.Date) // Преобразуем строку даты в объект Date
          };
        });
        return response;
      })
    );
  }

  // Topics Methods
  getTopic(id: number): Observable<Topic> {
    return this.http.get<Topic>(`${environment.apiUrl}/api/topics/${id}`).pipe(
      map((topic: Topic) => this.convertDates(topic))
    );
  }

  getTopicBySlug(slug: string): Observable<Topic> {
    return this.http.get<Topic>(`${environment.apiUrl}/api/topics/slug/${slug}`).pipe(
      map((topic: Topic) => this.convertDates(topic))
    );
  }

  createTopic(header: string, text: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/topics`, { Header: header, Text: text });
  }

  updateTopic(id: number, header: string, text: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/topics/${id}`, { Header: header, Text: text });
  }

  deleteTopic(id: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/api/topics/${id}`);
  }

  // Comments Methods
  addComment(topicId: number, text: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/comments/${topicId}/comments`, { Text: text });
  }

  editComment(id: number, text: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/comments/${id}`, { Text: text });
  }

  deleteComment(id: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/api/comments/${id}`);
  }

  getComment(id: number): Observable<Comment> {
    return this.http.get<any>(`${environment.apiUrl}/api/comments/${id}`);
  }

  // User Methods
  isSignedIn(): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/api/news/issignedin`);
  }

  getLoggedUser(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/news/loggeduser`);
  }

  // Helper function to convert Date strings to Date objects
  private convertDates(topic: Topic): Topic {
    if (typeof topic.Date === 'string') {
      topic.Date = new Date(topic.Date);
    }

    topic.UserComments.forEach(comment => {
      if (typeof comment.Date === 'string') {
        comment.Date = new Date(comment.Date);
      }
    });

    return topic;
  }
}
