import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'src/app/core/services/auth.service'; // <--- Import AuthService

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html'
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  isLoading = true;
  showModal = false; 
  userForm: FormGroup;
  isSubmitting = false;
  currentUserRole: string = ''; // <--- Track the role

  constructor(
    private userService: UserService, 
    private fb: FormBuilder, 
    private http: HttpClient,
    private authService: AuthService // <--- Inject AuthService
  ) {
    this.userForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['STUDENT', Validators.required] // Default to Student
    });
  }

  ngOnInit() {
    // 1. Get current role to decide UI layout
    this.authService.currentUser$.subscribe(u => {
      this.currentUserRole = u?.role || '';
    });
    
    this.fetchUsers();
  }

  fetchUsers() {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  openModal() {
    this.showModal = true;
    this.userForm.reset({ role: 'STUDENT' }); 
  }

  closeModal() {
    this.showModal = false;
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    this.isSubmitting = true;
    this.userService.createUser(this.userForm.value).subscribe({
      next: (res) => { 
        alert('User created successfully!');
        this.users.unshift(res.user); 
        this.isSubmitting = false;
        this.closeModal();
      },
      error: (err) => {
        alert(err.error?.error || 'Failed to create user');
        this.isSubmitting = false;
      }
    });
  }

  uploadCSV(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    this.isLoading = true;
    this.http.post(`${environment.apiUrl}/users/import`, formData).subscribe({
      next: (res: any) => {
        alert(res.message);
        this.fetchUsers(); 
      },
      error: (err) => {
        alert('Import failed');
        this.isLoading = false;
      }
    });
  }
}