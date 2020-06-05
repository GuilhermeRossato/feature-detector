import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { LocalStorageService } from './services/localstorage.service';
import { RawFileDescriptor } from './components/file-dropper/file-dropper.component';
import { ImageListViewComponent } from './components/image-list-view/image-list-view.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {

  public showDropImageOverlay = true;
  private isDraggingFile = false;
  private state: any = {};
  private error?: Error;
  @ViewChild(ImageListViewComponent) imageList: ImageListViewComponent;

  constructor(
    private localStorage: LocalStorageService
  ) {}

  ngOnInit() {
    this.loadStateFromStorage();
  }

  loadStateFromStorage() {
    const state = this.localStorage.getItem("feature-detector-state");
    if (!state || typeof state !== "string" || state[0] !== "{") {
      return;
    }
    let stateObj;
    try {
      stateObj = JSON.parse(stateObj);
    } catch (err) {
      console.warn(err);
      return;
    }
    for (let key of stateObj) {
      if (this.state[key]) {
        this.state[key] = stateObj[key];
      }
    }
  }

  onImageInsert(fileDesc: RawFileDescriptor) {
    if (this.isDraggingFile) {
      this.isDraggingFile = false;
    }
    this.showDropImageOverlay = false;
    const element = this.imageList;
    if (!element) {
      this.error = new Error(
        "Could not find the image list internal component"
      );
      return;
    }
    try {
      element.insertImage(fileDesc);
    } catch (err) {
      this.error = err;
    }
  }

}
