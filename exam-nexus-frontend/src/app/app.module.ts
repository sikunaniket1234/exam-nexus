import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'; // <--- Import these
import { ReactiveFormsModule, FormsModule } from '@angular/forms'; // Needed for Login Form
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Needed for PrimeNG/Toastr

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { LoginComponent } from './features/auth/login/login.component';
import { TeacherDashboardComponent } from './features/teacher-dashboard/teacher-dashboard.component';
import { CreateExamComponent } from './features/teacher-dashboard/create-exam/create-exam.component';
import { StudentDashboardComponent } from './features/student-dashboard/student-dashboard.component';
import { ExamTakerComponent } from './features/exam-taker/exam-taker.component';
import { ExamResultsComponent } from './features/teacher-dashboard/exam-results/exam-results.component';
import { UserManagementComponent } from './features/user-management/user-management.component';
import { SuperAdminComponent } from './features/super-admin/super-admin.component';
import { AssignExamComponent } from './features/teacher-dashboard/assign-exam/assign-exam.component';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { ReportingStudioComponent } from './features/admin-dashboard/reporting-studio/reporting-studio.component';
import { SchoolSettingsComponent } from './features/admin-dashboard/school-settings/school-settings.component';
import { EditExamComponent } from './features/teacher-dashboard/edit-exam/edit-exam.component';
import { QuestionBankComponent } from './features/teacher-dashboard/question-bank/question-bank.component'; // Import your interceptor

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    TeacherDashboardComponent,
    CreateExamComponent,
    StudentDashboardComponent,
    ExamTakerComponent,
    ExamResultsComponent,
    UserManagementComponent,
    SuperAdminComponent,
    AssignExamComponent,
    AdminDashboardComponent,
    ReportingStudioComponent,
    SchoolSettingsComponent,
    EditExamComponent,
    QuestionBankComponent,
    // your other components...
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,       // <--- Essential for API calls
    ReactiveFormsModule,    // <--- Essential for Forms
    BrowserAnimationsModule,
    FormsModule 
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true // This is crucial. It means "add this to the list of interceptors", don't replace them.
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }