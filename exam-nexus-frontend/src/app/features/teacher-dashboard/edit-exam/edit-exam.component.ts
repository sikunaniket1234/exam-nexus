import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-edit-exam',
  templateUrl: './edit-exam.component.html'
})
export class EditExamComponent implements OnInit {
  examId: string | null = null;
  exam: any = null;
  questions: any[] = [];
  isLoading = true;
  
  // Track which question is currently being edited
  editingQuestionId: number | null = null;
  tempQuestion: any = null; // Holds data while editing

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
    this.http.get<any>(`${environment.apiUrl}/exams/${this.examId}/questions`)
      .subscribe({
        next: (res) => {
          this.exam = res.exam;
          this.questions = res.questions;
          this.isLoading = false;
        },
        error: () => {
          alert('Failed to load questions');
          this.router.navigate(['/teacher/dashboard']);
        }
      });
  }

  // ENABLE EDIT MODE
  startEdit(question: any) {
    this.editingQuestionId = question.id;
    // Deep copy to avoid modifying the UI before saving
    this.tempQuestion = JSON.parse(JSON.stringify(question));
  }

  // CANCEL EDIT
  cancelEdit() {
    this.editingQuestionId = null;
    this.tempQuestion = null;
  }

  // HANDLE OPTION CHANGE (Radio button logic for Correct Answer)
  setCorrectOption(index: number) {
    this.tempQuestion.options.forEach((opt: any, i: number) => {
      opt.is_correct = (i === index);
    });
  }

  // SAVE CHANGES TO BACKEND
  saveQuestion() {
    this.http.put(`${environment.apiUrl}/exams/questions/${this.editingQuestionId}`, {
      question_text: this.tempQuestion.question_text,
      points: this.tempQuestion.points,
      options: this.tempQuestion.options
    }).subscribe({
      next: () => {
        // Update local list
        const index = this.questions.findIndex(q => q.id === this.editingQuestionId);
        if (index !== -1) {
          this.questions[index] = this.tempQuestion;
        }
        this.editingQuestionId = null;
        alert('Saved!');
      },
      error: () => alert('Failed to save changes')
    });
  }

  deleteQuestion(id: number) {
    if(!confirm('Are you sure? This cannot be undone.')) return;
    
    this.http.delete(`${environment.apiUrl}/exams/questions/${id}`)
      .subscribe({
        next: () => {
          this.questions = this.questions.filter(q => q.id !== id);
        },
        error: () => alert('Delete failed')
      });
  }
}