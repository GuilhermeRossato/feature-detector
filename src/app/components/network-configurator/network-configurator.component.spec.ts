import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkConfiguratorComponent } from './network-configurator.component';

describe('NetworkConfiguratorComponent', () => {
  let component: NetworkConfiguratorComponent;
  let fixture: ComponentFixture<NetworkConfiguratorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkConfiguratorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
