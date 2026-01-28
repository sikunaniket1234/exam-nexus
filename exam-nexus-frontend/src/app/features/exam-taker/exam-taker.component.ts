import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-exam-taker',
  templateUrl: './exam-taker.component.html'
})
export class ExamTakerComponent implements OnInit, OnDestroy {
  examId: string | null = null;
  examData: any = null;
  questions: any[] = [];
  
  // State
  currentQuestionIndex = 0;
  answers: any[] = []; 
  timeLeft: number = 0; 
  timerInterval: any;
  isLoading = true;
  isSubmitting = false;

  // --- PROCTORING STATE ---
  stream: MediaStream | null = null;
  isFullscreen = false;
  warnings = 0;
  maxWarnings = 3;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id');
    
    // 1. Initialize Proctoring
    this.startProctoring();
    this.requestFullscreen();

    // 2. Load Data
    this.loadExam();

    // 3. Heartbeat (Save Draft)
    setInterval(() => this.saveDraft(), 30000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    // Stop Camera
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  // ==========================================
  // 🎥 PROCTORING: CAMERA & MIC
  // ==========================================
  async startProctoring() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      alert("⚠️ CRITICAL: You cannot take this exam without Camera & Microphone access.");
      this.router.navigate(['/student/dashboard']);
    }
  }

  // ==========================================
  // 🔒 PROCTORING: FULLSCREEN ENFORCEMENT
  // ==========================================
  requestFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch(err => {
        console.error('Fullscreen denied:', err);
      });
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  onFullscreenChange() {
    // If document.fullscreenElement is null, they exited fullscreen
    this.isFullscreen = !!document.fullscreenElement;
  }

  // ==========================================
  // 🚫 PROCTORING: TAB SWITCH DETECTION
  // ==========================================
  @HostListener('document:visibilitychange', ['$event'])
  onVisibilityChange() {
    if (document.hidden && !this.isSubmitting) {
      this.warnings++;
      
      // Send warning to backend
      this.http.post(`${environment.apiUrl}/submissions/exam/${this.examId}/warning`, { type: 'TAB_SWITCH' })
        .subscribe();

      alert(`⚠️ WARNING: Tab switching detected! (${this.warnings}/${this.maxWarnings})`);

      if (this.warnings >= this.maxWarnings) {
        this.submitExam(true); // Force submit
      }
    }
  }

  // ==========================================
  // 📝 DATA LOADING & TIMER
  // ==========================================
  loadExam() {
    this.http.get<any>(`${environment.apiUrl}/submissions/exam/${this.examId}/take`)
      .subscribe({
        next: (res) => {
          this.examData = res.exam;
          this.questions = res.questions;
          
          if (res.saved_answers) {
            this.answers = res.saved_answers;
          }

          // Calculate Time
          const serverTime = new Date(res.server_time).getTime();
          const endTime = new Date(res.end_time).getTime();
          this.timeLeft = Math.floor((endTime - serverTime) / 1000);

          if (this.timeLeft > 0) {
            this.startTimer();
          } else {
            alert('Exam time has ended!');
            this.router.navigate(['/student/dashboard']);
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          alert('Failed to load exam. Please try again.');
          this.router.navigate(['/student/dashboard']);
        }
      });
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.submitExam();
      }
    }, 1000);
  }

  get formattedTime() {
    const h = Math.floor(this.timeLeft / 3600);
    const m = Math.floor((this.timeLeft % 3600) / 60);
    const s = this.timeLeft % 60;
    return `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
  }

  // ==========================================
  // ✅ ANSWERS & SUBMISSION
  // ==========================================
  selectOption(questionId: number, optionIndex: number) {
    this.answers = this.answers.filter(a => a.question_id !== questionId);
    this.answers.push({ question_id: questionId, selected_option_index: optionIndex });
  }

  isOptionSelected(questionId: number, optionIndex: number): boolean {
    return this.answers.some(a => a.question_id === questionId && a.selected_option_index === optionIndex);
  }

  saveDraft() {
    if (!this.examId || this.answers.length === 0 || this.isSubmitting) return;
    this.http.post(`${environment.apiUrl}/submissions/exam/${this.examId}/draft`, { answers: this.answers })
      .subscribe(() => console.log('Draft auto-saved'));
  }

  submitExam(forced = false) {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    clearInterval(this.timerInterval);

    if (forced) {
      alert('🚫 MAX WARNINGS REACHED. Your exam is being auto-submitted.');
    }

    this.http.post(`${environment.apiUrl}/submissions/exam/${this.examId}/submit`, { answers: this.answers })
      .subscribe({
        next: () => {
          if (!forced) alert('Exam Submitted Successfully!');
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
          this.router.navigate(['/student/dashboard']);
        },
        error: (err) => {
          this.isSubmitting = false;
          alert('Submission failed. Please try again.');
        }
      });
  }
}