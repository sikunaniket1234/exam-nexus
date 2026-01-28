import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-school-settings',
  templateUrl: './school-settings.component.html'
})
export class SchoolSettingsComponent implements OnInit {
  settingsForm: FormGroup;
  isLoading = true;
  isSaving = false;
  currentLogoUrl: string | null = null;
  selectedFile: File | null = null;
  subdomain = ''; // Read-only

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.settingsForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.fetchSettings();
  }

  fetchSettings() {
    this.http.get<any>(`${environment.apiUrl}/schools/settings`)
      .subscribe({
        next: (data) => {
          this.settingsForm.patchValue({ name: data.name });
          this.subdomain = data.subdomain;
          this.currentLogoUrl = data.logo_url;
          this.isLoading = false;
        },
        error: () => {
          alert('Failed to load settings');
          this.isLoading = false;
        }
      });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Create a local preview
      const reader = new FileReader();
      reader.onload = (e: any) => this.currentLogoUrl = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  saveSettings() {
    if (this.settingsForm.invalid) return;
    this.isSaving = true;

    const formData = new FormData();
    formData.append('name', this.settingsForm.get('name')?.value);
    if (this.selectedFile) {
      formData.append('logo', this.selectedFile);
    }

    this.http.put(`${environment.apiUrl}/schools/settings`, formData)
      .subscribe({
        next: () => {
          alert('Settings Saved!');
          this.isSaving = false;
        },
        error: () => {
          alert('Failed to update settings');
          this.isSaving = false;
        }
      });
  }
}