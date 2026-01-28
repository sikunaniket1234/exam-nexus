// src/app/features/teacher-dashboard/teacher-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html'
})
export class TeacherDashboardComponent implements OnInit {
  exams: any[] = [];
  isLoading = true;
  user: any;

  constructor(
    private http: HttpClient, 
    private authService: AuthService, 
    private router: Router
  ) {
    this.authService.currentUser$.subscribe(u => this.user = u);
  }
  
  ngOnInit() {
    this.fetchExams();
  }

  fetchExams() {
    this.http.get<any[]>(`${environment.apiUrl}/exams/teacher/list`)
      .subscribe({
        next: (data) => {
          this.exams = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  createExam() {
    this.router.navigate(['/teacher/create-exam']);
  }

  logout() {
    this.authService.logout();
  }

  // --- NEW PUBLISH METHOD ---
  publishExam(examId: number) {
    if (!confirm('Are you sure you want to publish this exam? Students will be able to see it.')) {
      return;
    }

    this.http.patch(`${environment.apiUrl}/exams/${examId}/publish`, {})
      .subscribe({
        next: () => {
          alert('Exam Published!');
          // Update the local list immediately without reloading
          const exam = this.exams.find(e => e.id === examId);
          if (exam) exam.is_published = true;
        },
        error: (err) => {
          console.error(err);
          alert('Failed to publish exam.');
        }
      });
  }
}