import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserTopicsTableComponent } from './user-topics-table.component';

describe('UserTopicsTableComponent', () => {
  let component: UserTopicsTableComponent;
  let fixture: ComponentFixture<UserTopicsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserTopicsTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserTopicsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
