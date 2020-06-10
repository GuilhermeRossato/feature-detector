import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { LocalStorageService } from './services/local-storage.service';
import { RawFileDescriptor } from './components/file-dropper/file-dropper.component';
import { ImageListViewComponent } from './components/image-list-view/image-list-view.component';
import { NetworkConfiguratorComponent } from './components/network-configurator/network-configurator.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit, AfterViewInit {

  public showDropImageOverlay = true;
  public error?: Error;
  public selection: {canvas: HTMLCanvasElement, x: number, y: number} = null;
  public config: {
    brushSize: number,
    brushSpacing: number,
    brushShape: string,
    inputFormat: string,
    hiddenLayerCount: number,
    hiddenNeuronCount: number,
    activationFunction: string,
    epochCount: number
  }
  public canvasList: HTMLCanvasElement[];
  private state: any = {};

  @ViewChild(ImageListViewComponent) imageList: ImageListViewComponent;

  constructor(
    private localStorage: LocalStorageService
  ) {}

  ngOnInit() {
    this.loadStateFromStorage();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.loadImageListFromStorage();
    }, 50);
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

  onCanvasAdded(canvas: HTMLCanvasElement) {
    this.canvasList.push(canvas);
  }

  onCanvasSelect(selection: {canvas: HTMLCanvasElement, x: number, y: number}) {
    this.selection = selection;
  }

  onRemoveImageRequest(
    { canvas, url, id, left }: { canvas: HTMLCanvasElement; url: string; id: number; left: number }
  ) {
    let imageDesc = this.fetchImageListFromStorage();
    if (!imageDesc) {
      return;
    }
    if (left <= 0) {
      imageDesc = [];
      this.showDropImageOverlay = true;
      this.saveImageListToCache(imageDesc);
    } else {
      let cachedId;
      for (let i = 0; i < imageDesc.length; i++) {
        if (imageDesc[i].url === url) {
          cachedId = i;
          break;
        }
      }
      if (typeof cachedId !== "number") {
        console.log("Image has not been saved or has already been removed");
        return;
      }
      imageDesc.splice(cachedId, 1);
      this.saveImageListToCache(imageDesc);
    }
    if (this.canvasList[id] !== canvas) {
      throw new Error("Canvas list on image list differs from canvas list on app root");
    }
    this.canvasList = this.canvasList.filter(internalCanvas => internalCanvas !== canvas);
  }

  fetchImageListFromStorage(): RawFileDescriptor[] {
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
    return imageDescObj;
  }

  loadImageListFromStorage() {
    const imageDesc = this.fetchImageListFromStorage();
    if (!imageDesc) {
      return;
    }
    this.onImageInsert(imageDesc, false);
  }

  onImageInsert(fileDescList: RawFileDescriptor[], shouldSaveAsCache = true) {
    this.showDropImageOverlay = false;
    const element = this.imageList;
    try {
      if (!element) {
        throw new Error("Could not find the image list internal component");
      }
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
    if (fileDescList.length === 0) {
      this.localStorage.setItem("vfd-image-list", "[]", null);
      return;
    }
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

  onConfigChange(obj: {
    brushSize: number,
    brushSpacing: number,
    brushShape: string,
    inputFormat: string,
    hiddenLayerCount: number,
    hiddenNeuronCount: number,
    activationFunction: string,
    epochCount: number
  }) {
    this.config = obj;
  }

}
