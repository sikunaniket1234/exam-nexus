import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reporting-studio',
  templateUrl: './reporting-studio.component.html'
})
export class ReportingStudioComponent implements OnInit {
  data: any = null;
  isLoading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/reports/admin/stats`)
      .subscribe({
        next: (res) => {
          this.data = res;
          this.isLoading = false;
        },
        error: () => this.isLoading = false
      });
  }

  downloadPDF(type: 'TEACHERS' | 'STUDENTS') {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    if (type === 'TEACHERS') {
      doc.text(`Teacher Performance Report - ${date}`, 14, 20);
      autoTable(doc, {
        startY: 30,
        head: [['Name', 'Email', 'Exams Created']],
        body: this.data.teachers.map((t: any) => [t.full_name, t.email, t.exams_created]),
      });
      doc.save('teacher-report.pdf');
    } 
    
    else if (type === 'STUDENTS') {
      doc.text(`Top Students Report - ${date}`, 14, 20);
      autoTable(doc, {
        startY: 30,
        head: [['Name', 'Exams Taken', 'Avg Score']],
        body: this.data.students.map((s: any) => [s.full_name, s.exams_taken, s.avg_score]),
      });
      doc.save('student-report.pdf');
    }
  }
}