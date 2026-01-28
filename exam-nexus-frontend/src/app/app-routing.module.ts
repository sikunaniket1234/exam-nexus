import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { TeacherDashboardComponent } from './features/teacher-dashboard/teacher-dashboard.component';
import { AuthGuard } from './core/guards/auth.guard';
import { CreateExamComponent } from './features/teacher-dashboard/create-exam/create-exam.component'; // <--- Import this
import { StudentDashboardComponent } from './features/student-dashboard/student-dashboard.component'; // <--- Import
import { ExamTakerComponent } from './features/exam-taker/exam-taker.component'; // <--- Import
import { ExamResultsComponent } from './features/teacher-dashboard/exam-results/exam-results.component'; // <--- Import
import { UserManagementComponent } from './features/user-management/user-management.component';
import { SuperAdminComponent } from './features/super-admin/super-admin.component';
import { AssignExamComponent } from './features/teacher-dashboard/assign-exam/assign-exam.component';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { ReportingStudioComponent } from './features/admin-dashboard/reporting-studio/reporting-studio.component';
import { SchoolSettingsComponent } from './features/admin-dashboard/school-settings/school-settings.component';
import { EditExamComponent } from './features/teacher-dashboard/edit-exam/edit-exam.component';
import { QuestionBankComponent } from './features/teacher-dashboard/question-bank/question-bank.component';
const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'super-admin', component: SuperAdminComponent }, // No Guard for now, keep it secret
  { 
    path: 'teacher/dashboard', 
    component: TeacherDashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'teacher/create-exam', 
    component: CreateExamComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'student/dashboard', 
    component: StudentDashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'student/exam/:id', 
    component: ExamTakerComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'teacher/exam/:id/results', 
    component: ExamResultsComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'admin/users', 
    component: UserManagementComponent, 
    canActivate: [AuthGuard] 
  },
  { path: 'teacher/exam/:id/assign', component: AssignExamComponent, canActivate: [AuthGuard] },
  { 
    path: 'admin/dashboard', 
    component: AdminDashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { path: 'admin/reports', component: ReportingStudioComponent, canActivate: [AuthGuard] },
  { path: 'admin/settings', component: SchoolSettingsComponent, canActivate: [AuthGuard] },
  { path: 'teacher/exam/:id/edit', component: EditExamComponent, canActivate: [AuthGuard] },
  { path: 'teacher/question-bank', component: QuestionBankComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
