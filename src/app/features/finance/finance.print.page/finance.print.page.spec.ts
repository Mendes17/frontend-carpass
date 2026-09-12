import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancePrintPage } from './finance.print.page';

describe('FinancePrintPage', () => {
  let component: FinancePrintPage;
  let fixture: ComponentFixture<FinancePrintPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancePrintPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinancePrintPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
