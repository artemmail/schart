import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YooMoneyOperationsComponent } from './yoo-money-operations.component';

describe('YooMoneyOperationsComponent', () => {
  let component: YooMoneyOperationsComponent;
  let fixture: ComponentFixture<YooMoneyOperationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YooMoneyOperationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YooMoneyOperationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
