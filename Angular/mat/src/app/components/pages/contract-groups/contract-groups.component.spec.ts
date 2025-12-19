import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContractGroupsComponent } from './contract-groups.component';

describe('ContractGroupsComponent', () => {
  let component: ContractGroupsComponent;
  let fixture: ComponentFixture<ContractGroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractGroupsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
