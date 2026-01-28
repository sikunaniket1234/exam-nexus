import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  // FIX: Add <any[]> to tell TS this returns a list
  getUsers() {
    return this.http.get<any[]>(`${this.apiUrl}/list`);
  }

  // FIX: Add <any> to tell TS this returns an object with { user: ... }
  createUser(user: any) {
    return this.http.post<any>(`${this.apiUrl}/create`, user);
  }
}