import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageListViewComponent } from './image-list-view.component';

describe('ImageListViewComponent', () => {
  let component: ImageListViewComponent;
  let fixture: ComponentFixture<ImageListViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageListViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
