import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-create-exam',
  templateUrl: './create-exam.component.html'
})
export class CreateExamComponent {
  mode: 'AI' | 'MANUAL' = 'AI';
  examForm: FormGroup;
  isGenerating = false;
  isSaving = false;
  selectedFile: File | null = null;
  showBankModal = false;
  bankQuestions: any[] = [];
  selectedBankQuestions: any[] = [];
  filterSubject = '';
  filterDifficulty = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.examForm = this.fb.group({
      // --- GLOBAL CONFIG (Used by both modes) ---
      title: ['', Validators.required],
      instructions: [''],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      
      // NEW: Auto Publish Flag
      auto_publish: [false], 

      // --- AI MODE SPECIFIC ---
      textContent: [''],
      question_count: [5], 
      marks_per_question: [1],
      difficulty: ['Medium'],

      // --- MANUAL MODE SPECIFIC ---
      manualQuestions: this.fb.array([]) 
    });
  }

  // --- GETTERS FOR FORM ARRAYS ---
  get manualQuestions(): FormArray {
    return this.examForm.get('manualQuestions') as FormArray;
  }

  getOptions(questionIndex: number): FormArray {
    return this.manualQuestions.at(questionIndex).get('options') as FormArray;
  }

  getQuestionControl(index: number, controlName: string): FormControl {
    return this.manualQuestions.at(index).get(controlName) as FormControl;
  }

  // --- MANUAL MODE HELPERS ---
  addQuestion() {
    const questionGroup = this.fb.group({
      question_text: ['', Validators.required],
      points: [1, [Validators.required, Validators.min(1)]],
      correct_option_index: [0, Validators.required], 
      options: this.fb.array([
        this.createOption(),
        this.createOption(),
        this.createOption(),
        this.createOption()
      ])
    });
    this.manualQuestions.push(questionGroup);
  }

  removeQuestion(index: number) {
    this.manualQuestions.removeAt(index);
  }

  createOption() {
    return this.fb.group({
      text: ['', Validators.required]
    });
  }

  addOption(questionIndex: number) {
    this.getOptions(questionIndex).push(this.createOption());
  }

  removeOption(questionIndex: number, optionIndex: number) {
    this.getOptions(questionIndex).removeAt(optionIndex);
  }

  // --- FILE HANDLING ---
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  //Helper for validation
  validateAutoPublish(): boolean {
    const isAutoPublish = this.examForm.get('auto_publish')?.value;
    if (isAutoPublish) {
      const startTime = new Date(this.examForm.get('start_time')?.value).getTime();
      const now = new Date().getTime();
      const twoHoursInMs = 2 * 60 * 60 * 1000;

      if (startTime - now < twoHoursInMs) {
        alert('⚠️ Rule Check: For Auto-Publish, the exam must be scheduled at least 2 hours in the future.');
        return false;
      }
    }
    return true;
  }

  // --- SUBMIT: AI MODE ---
  generateWithAI() {
    if (this.examForm.invalid) return; 
    
    // Validate 2-Hour Rule
    if (!this.validateAutoPublish()) return;

    this.isGenerating = true;

    const formData = new FormData();
    formData.append('title', this.examForm.get('title')?.value);
    formData.append('instructions', this.examForm.get('instructions')?.value);
    formData.append('start_time', this.examForm.get('start_time')?.value);
    formData.append('end_time', this.examForm.get('end_time')?.value);
    
    // Append Auto Publish
    const isAutoPublish = this.examForm.get('auto_publish')?.value;
    formData.append('auto_publish', isAutoPublish ? 'true' : 'false');

    formData.append('text_content', this.examForm.get('textContent')?.value || '');
    formData.append('question_count', this.examForm.get('question_count')?.value);
    formData.append('marks_per_question', this.examForm.get('marks_per_question')?.value);
    formData.append('difficulty', this.examForm.get('difficulty')?.value);

    if (this.selectedFile) {
      formData.append('reference_file', this.selectedFile);
    }

    this.http.post<any>(`${environment.apiUrl}/exams/generate`, formData)
      .subscribe({
        next: () => {
          this.isGenerating = false;
          alert('Exam Generated Successfully! ' + (isAutoPublish ? 'It will auto-publish at the start time.' : ''));
          this.router.navigate(['/teacher/dashboard']);
        },
        error: (err) => {
          this.isGenerating = false;
          alert('Failed: ' + (err.error?.error || 'Unknown error'));
        }
      });
  }

  // --- SUBMIT: MANUAL MODE ---
  saveManualExam() {
    if (this.examForm.get('title')?.invalid || this.manualQuestions.length === 0) {
      alert("Please fill in the title and add at least one question.");
      return;
    }

    // Validate 2-Hour Rule
    if (!this.validateAutoPublish()) return;

    this.isSaving = true;
    const formVal = this.examForm.value;

    // Construct Payload
    const payload = {
      title: formVal.title,
      instructions: formVal.instructions,
      start_time: formVal.start_time,
      end_time: formVal.end_time,
      auto_publish: formVal.auto_publish, // Add to payload
      questions: formVal.manualQuestions.map((q: any) => ({
        question_text: q.question_text,
        points: q.points,
        options: q.options.map((opt: any, index: number) => ({
          text: opt.text,
          is_correct: index === parseInt(q.correct_option_index) 
        }))
      }))
    };

    this.http.post(`${environment.apiUrl}/exams/manual`, payload)
      .subscribe({
        next: () => {
          this.isSaving = false;
          alert('Exam Created Successfully! ' + (formVal.auto_publish ? 'It will auto-publish at the start time.' : ''));
          this.router.navigate(['/teacher/dashboard']);
        },
        error: (err) => {
          this.isSaving = false;
          console.error(err);
          alert('Failed to save exam.');
        }
      });
  }
  // Fetch from Bank
openBankModal() {
  this.showBankModal = true;
  this.fetchBankQuestions();
}

fetchBankQuestions() {
  let params: any = {};
  if (this.filterSubject) params.subject = this.filterSubject;
  if (this.filterDifficulty) params.difficulty = this.filterDifficulty;

  this.http.get<any[]>(`${environment.apiUrl}/bank`, { params })
    .subscribe(data => this.bankQuestions = data);
}

// Select/Deselect
toggleBankSelection(q: any) {
  const index = this.selectedBankQuestions.findIndex(sq => sq.id === q.id);
  if (index === -1) this.selectedBankQuestions.push(q);
  else this.selectedBankQuestions.splice(index, 1);
}

// Import Selected to Form
importSelected() {
  this.selectedBankQuestions.forEach(q => {
    // Convert Bank Schema to Form Schema
    const questionGroup = this.fb.group({
      question_text: [q.question_text, Validators.required],
      points: [q.points, Validators.required],
      correct_option_index: [q.options.findIndex((o:any) => o.is_correct), Validators.required],
      options: this.fb.array(q.options.map((o:any) => this.fb.group({ text: o.text })))
    });
    
    // Add to Manual Questions Array
    this.manualQuestions.push(questionGroup);
  });

  this.showBankModal = false;
  this.selectedBankQuestions = [];
  alert('Questions Imported!');
}
}