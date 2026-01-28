import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html'
})
export class SuperAdminComponent implements OnInit {
  schools: any[] = [];
  onboardForm: FormGroup;
  isSubmitting = false;

  constructor(private http: HttpClient, private fb: FormBuilder) {
    this.onboardForm = this.fb.group({
      school_name: ['', Validators.required],
      subdomain: ['', [Validators.required, Validators.pattern('^[a-z0-9-]+$')]], // Alphanumeric only
      admin_name: ['', Validators.required],
      admin_email: ['', [Validators.required, Validators.email]],
      admin_password: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.fetchSchools();
  }

  fetchSchools() {
    this.http.get<any[]>(`${environment.apiUrl}/schools/list`)
      .subscribe(data => this.schools = data);
  }

  createSchool() {
    if (this.onboardForm.invalid) return;
    this.isSubmitting = true;

    this.http.post(`${environment.apiUrl}/schools/onboard`, this.onboardForm.value)
      .subscribe({
        next: () => {
          alert('School Created!');
          this.isSubmitting = false;
          this.onboardForm.reset();
          this.fetchSchools();
        },
        error: (err) => {
          alert(err.error?.error || 'Failed');
          this.isSubmitting = false;
        }
      });
  }
}