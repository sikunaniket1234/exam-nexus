import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-assign-exam',
  templateUrl: './assign-exam.component.html'
})
export class AssignExamComponent implements OnInit {
  examId: string | null = null;
  students: any[] = [];
  selectedStudentIds: Set<number> = new Set();
  isOpenToAll = true; // Default
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id');
    this.loadData();
  }

  loadData() {
    // Fetch all students in school
    this.http.get<any[]>(`${environment.apiUrl}/users/list`).subscribe(users => {
      this.students = users.filter(u => u.role === 'STUDENT');
      this.isLoading = false;
    });
  }

  toggleStudent(id: number) {
    if (this.selectedStudentIds.has(id)) {
      this.selectedStudentIds.delete(id);
    } else {
      this.selectedStudentIds.add(id);
    }
  }

  saveAssignment() {
    const payload = {
      isOpenToAll: this.isOpenToAll,
      studentIds: Array.from(this.selectedStudentIds)
    };

    this.http.post(`${environment.apiUrl}/exams/${this.examId}/assign`, payload)
      .subscribe({
        next: () => {
          alert('Access settings saved!');
          this.router.navigate(['/teacher/dashboard']);
        },
        error: () => alert('Failed to save settings')
      });
  }
}