import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportingStudioComponent } from './reporting-studio.component';

describe('ReportingStudioComponent', () => {
  let component: ReportingStudioComponent;
  let fixture: ComponentFixture<ReportingStudioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReportingStudioComponent]
    });
    fixture = TestBed.createComponent(ReportingStudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
