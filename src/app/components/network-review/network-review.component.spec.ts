import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkReviewComponent } from './network-review.component';

describe('NetworkReviewComponent', () => {
  let component: NetworkReviewComponent;
  let fixture: ComponentFixture<NetworkReviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkReviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
