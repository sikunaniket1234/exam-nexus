import { Component } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent {
  
  // Inject AuthService to use it in the HTML (authService.logout())
  constructor(public authService: AuthService) {}

}