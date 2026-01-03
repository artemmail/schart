import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FootPrintSettingsDialogComponent } from './footprint-settings-dialog.component';

describe('FootPrintSettingsDialogComponent', () => {
  let component: FootPrintSettingsDialogComponent;
  let fixture: ComponentFixture<FootPrintSettingsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FootPrintSettingsDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FootPrintSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
