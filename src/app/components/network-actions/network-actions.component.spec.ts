import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkActionsComponent } from './network-actions.component';

describe('NetworkActionsComponent', () => {
  let component: NetworkActionsComponent;
  let fixture: ComponentFixture<NetworkActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkActionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
