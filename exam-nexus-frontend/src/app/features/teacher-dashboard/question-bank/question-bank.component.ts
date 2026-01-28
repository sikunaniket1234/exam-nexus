import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-question-bank',
  templateUrl: './question-bank.component.html'
})
export class QuestionBankComponent implements OnInit {
  activeTab: 'LIBRARY' | 'MANUAL' | 'AI' = 'LIBRARY';
  
  // Library Data
  questions: any[] = [];
  filterSubject = '';
  
  // Manual Form
  manualForm: FormGroup;
  
  // AI Form
  aiForm: FormGroup;
  isGenerating = false;
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    // Manual Question Form
    this.manualForm = this.fb.group({
      subject: ['Math', Validators.required],
      difficulty: ['Medium', Validators.required],
      question_text: ['', Validators.required],
      points: [1, Validators.required],
      options: this.fb.array([
        this.createOption(), this.createOption(), this.createOption(), this.createOption()
      ]),
      correct_index: [0]
    });

    // AI Generator Form
    this.aiForm = this.fb.group({
      subject: ['Science', Validators.required],
      difficulty: ['Medium', Validators.required],
      question_count: [5, Validators.required],
      textContent: ['']
    });
  }

  ngOnInit() {
    this.fetchLibrary();
  }

  // --- TAB 1: LIBRARY ---
  fetchLibrary() {
    const params: any = {};
    if (this.filterSubject) params.subject = this.filterSubject;
    
    this.http.get<any[]>(`${environment.apiUrl}/bank`, { params })
      .subscribe(data => this.questions = data);
  }

  deleteQuestion(id: number) {
    if(!confirm('Delete this question?')) return;
    // (Add delete endpoint in backend if needed, skipping for brevity)
    // this.http.delete(...)
  }

  // --- TAB 2: MANUAL ADD ---
  createOption() { return this.fb.group({ text: ['', Validators.required] }); }
  get manualOptions() { return (this.manualForm.get('options') as FormArray).controls; }

  saveManual() {
    if (this.manualForm.invalid) return;
    
    const val = this.manualForm.value;
    const formattedOptions = val.options.map((opt:any, i:number) => ({
      text: opt.text,
      is_correct: i == val.correct_index
    }));

    this.http.post(`${environment.apiUrl}/bank/add`, {
      ...val,
      options: formattedOptions
    }).subscribe(() => {
      alert('Saved!');
      this.manualForm.reset({ subject: 'Math', difficulty: 'Medium', points: 1, correct_index: 0 });
      this.fetchLibrary();
      this.activeTab = 'LIBRARY';
    });
  }

  // --- TAB 3: AI GENERATE ---
  onFileSelected(event: any) { this.selectedFile = event.target.files[0]; }

  generateAiQuestions() {
    this.isGenerating = true;
    const val = this.aiForm.value;

    const formData = new FormData();
    formData.append('subject', val.subject); // Pass subject to help AI context
    formData.append('question_count', val.question_count);
    formData.append('difficulty', val.difficulty);
    formData.append('text_content', val.textContent);
    // We reuse the existing exam generator endpoint but just ask for JSON back
    // Or better: We call the generate endpoint, get the JSON, then save to bank.
    
    // NOTE: For simplicity, we assume your /exams/generate endpoint returns questions.
    // If not, we might need a specific /exams/generate-preview endpoint. 
    // Let's assume we use the same logic but handle the save differently.
    
    if (this.selectedFile) formData.append('reference_file', this.selectedFile);

    // 1. Generate Questions
    this.http.post<any>(`${environment.apiUrl}/exams/generate-preview`, formData) // You might need to create this route that returns JSON only
      .subscribe({
        next: (res) => {
          // res.questions contains the AI generated array
          
          // 2. Save to Bank
          this.http.post(`${environment.apiUrl}/bank/bulk`, {
            questions: res.questions,
            subject: val.subject,
            difficulty: val.difficulty
          }).subscribe(() => {
            this.isGenerating = false;
            alert(`Success! Added ${res.questions.length} AI questions to the ${val.subject} bank.`);
            this.fetchLibrary();
            this.activeTab = 'LIBRARY';
          });
        },
        error: () => {
          this.isGenerating = false;
          alert('AI Generation Failed');
        }
      });
  }
}