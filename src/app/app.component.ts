import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { LocalStorageService } from './services/localstorage.service';
import { RawFileDescriptor } from './components/file-dropper/file-dropper.component';
import { ImageListViewComponent } from './components/image-list-view/image-list-view.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit, AfterViewInit {

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

  ngAfterViewInit() {
    this.loadImageListFromStorage();
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

  loadImageListFromStorage() {
    const imageListDesc = this.localStorage.getItem("vfd-image-list");
    if (typeof imageListDesc !== "string") {
      return;
    }
    let imageDescObj;
    try {
      imageDescObj = JSON.parse(imageListDesc);
    } catch (err) {
      console.warn(err);
      return;
    }
    if (!(imageDescObj instanceof Array) || imageDescObj.length <= 0) {
      return;
    }
    this.onImageInsert(imageDescObj, false);
  }

  onImageInsert(fileDescList: RawFileDescriptor[], shouldSaveAsCache = true) {
    this.showDropImageOverlay = false;
    const element = this.imageList;
    if (!element) {
      this.error = new Error(
        "Could not find the image list internal component"
      );
      return;
    }
    try {
      for (let fileDesc of fileDescList) {
        element.insertImage(fileDesc);
      }
    } catch (err) {
      this.error = err;
    }
    if (shouldSaveAsCache) {
      this.saveImageListToCache(fileDescList);
    }
  }

  saveImageListToCache(fileDescList: RawFileDescriptor[]) {
    const accumulatedSizeLimit = 2 * 1024 * 1024;
    let accumulatedSize = 0;
    let index = 0;
    for (index = 0; index < fileDescList.length; index++) {
      accumulatedSize += fileDescList[index].size;
      if (accumulatedSize > accumulatedSizeLimit) {
        index--;
        break;
      }
    }
    if (index < 1) {
      return;
    }

    const fileListSlice = fileDescList.slice(0, index);

    this.localStorage.setItem("vfd-image-list", JSON.stringify(fileListSlice), null);
  }

}
