import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-exam-results',
  templateUrl: './exam-results.component.html'
})
export class ExamResultsComponent implements OnInit {
  examId: string | null = null;
  stats: any = { total_submissions: 0, students: [] };
  isLoading = true;
  isPublishing = false;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id');
    this.loadStats();
  }

  loadStats() {
    // 1. Get General Stats (Who submitted)
    this.http.get<any>(`${environment.apiUrl}/exams/${this.examId}/stats`)
      .subscribe({
        next: (data) => {
          this.stats = data;
          this.checkViolations(); // Chain the next call
        },
        error: (err) => console.error(err)
      });
  }

  checkViolations() {
    // 2. Get Cheating Data (Who switched tabs)
    this.http.get<any[]>(`${environment.apiUrl}/reports/violations/${this.examId}`)
      .subscribe({
        next: (violators) => {
          // Merge violation counts into the main student list
          this.stats.students.forEach((student: any) => {
            const v = violators.find((x: any) => x.full_name === student.full_name); // simplistic match
            student.violation_count = v ? v.violation_count : 0;
          });
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  publishResults() {
    if (!confirm('Are you sure? This will email results to ALL students.')) return;
    
    this.isPublishing = true;
    this.http.post(`${environment.apiUrl}/exams/${this.examId}/publish`, {})
      .subscribe({
        next: (res: any) => {
          alert(res.message); // "Results published! Sending emails..."
          this.isPublishing = false;
        },
        error: (err) => {
          alert(err.error?.error || 'Failed to publish');
          this.isPublishing = false;
        }
      });
  }
}