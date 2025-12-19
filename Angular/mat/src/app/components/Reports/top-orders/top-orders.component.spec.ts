import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopOrdersComponent } from './top-orders.component';

describe('TopOrdersComponent', () => {
  let component: TopOrdersComponent;
  let fixture: ComponentFixture<TopOrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopOrdersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TopOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
