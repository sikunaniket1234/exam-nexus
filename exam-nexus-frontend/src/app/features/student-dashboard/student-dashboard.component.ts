import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html'
})
export class StudentDashboardComponent implements OnInit {
  exams: any[] = [];
  isLoading = true;
  user: any;
  currentTime = new Date();

  constructor(
    private http: HttpClient, 
    public authService: AuthService,
    private router: Router
  ) {
    this.authService.currentUser$.subscribe(u => this.user = u);
  }

  ngOnInit() {
    this.fetchExams();
    
    // Update "current time" every minute so buttons enable/disable automatically
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  fetchExams() {
    this.http.get<any[]>(`${environment.apiUrl}/exams/student/list`)
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

  getExamStatus(exam: any): 'UPCOMING' | 'ACTIVE' | 'EXPIRED' {
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    if (now < start) return 'UPCOMING';
    if (now > end) return 'EXPIRED';
    return 'ACTIVE';
  }

  startExam(examId: number) {
    // We will build this 'exam-taker' route next
    this.router.navigate(['/student/exam', examId]);
  }
}