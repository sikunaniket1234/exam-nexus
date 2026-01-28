import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamTakerComponent } from './exam-taker.component';

describe('ExamTakerComponent', () => {
  let component: ExamTakerComponent;
  let fixture: ComponentFixture<ExamTakerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExamTakerComponent]
    });
    fixture = TestBed.createComponent(ExamTakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
