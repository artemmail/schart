import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationDetailsDialogComponent } from './operation-details-dialog.component';

describe('OperationDetailsDialogComponent', () => {
  let component: OperationDetailsDialogComponent;
  let fixture: ComponentFixture<OperationDetailsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationDetailsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationDetailsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
