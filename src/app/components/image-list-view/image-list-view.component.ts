import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';
import { AppendedImageService } from 'src/app/services/appended-image.service';

interface ImageEntry {
  name: string,
  src: string,
  state: "waiting" | "loading" | "loaded",
  element?: HTMLImageElement,
  container?: HTMLElement,
  canvas?: HTMLCanvasElement,
  ctx?: CanvasRenderingContext2D,
  width?: number,
  height?: number,
  labelList?: string[],
  description?: string
}

@Component({
  selector: 'app-image-list-view',
  templateUrl: './image-list-view.component.html',
  styleUrls: ['./image-list-view.component.css']
})
export class ImageListViewComponent implements OnInit {

  public imageList: ImageEntry[] = [];
  private imageInsertTimer: any;

  @Output() removeImageAction = new EventEmitter<string | true>();
  @ViewChild("listWrapper") listWrapper: ElementRef<HTMLDivElement>;

  constructor(
    private appendedImage: AppendedImageService
  ) { }

  ngOnInit(): void {
  }

  private onImageFinishLoading(image: ImageEntry) {
    const index = this.imageList.indexOf(image);
    if (index === -1) {
      return; // Ignore load if image has been removed
    }
    if (!this.listWrapper || !this.listWrapper.nativeElement) {
      console.warn("Missing image list wrapper element");
      return;
    }
    const container = this.listWrapper.nativeElement.querySelector(`[data-index="${index}"]`);
    if (!(container instanceof HTMLElement)) {
      console.warn("Could not find corresponding image container");
      return;
    }
    const imageElement = container.querySelector("img");
    const canvasElement = container.querySelector("canvas");
    if (!(imageElement instanceof HTMLImageElement) && !(canvasElement instanceof HTMLCanvasElement)) {
      console.warn("Could not find corresponding image inner elements");
      return;
    }
    canvasElement.width = image.width = imageElement.width;
    canvasElement.height = image.height = imageElement.height;
    image.ctx = canvasElement.getContext("2d");
    image.ctx.drawImage(image.element, 0, 0, image.width, image.height);
    image.element = null;
    image.state = "loaded";
    this.initializeDescription(image);
  }

  onRemoveClick(button: HTMLButtonElement, image: ImageEntry, id: number) {
    if (this.imageList.length <= 1) {
      this.imageList = [];
      this.removeImageAction.emit(true);
      return;
    }
    this.removeImageAction.emit(image.src);
    this.imageList.splice(id, 1);
  }

  initializeDescription(image: ImageEntry) {
    if (!this.appendedImage.isAnnotatedCanvas(image.canvas, image.ctx)) {
      image.labelList = [];
      image.description = "No label data";
      return;
    }
    const labelList = this.appendedImage.getAnnotationFromCanvas(image.canvas, image.ctx);;
    if (!(labelList instanceof Array) || labelList.length < 1) {
      image.labelList = [];
      image.description = "Empty label array";
      return;
    }
    image.labelList = labelList;
    if (labelList.length === 1) {
      image.description = `1 label: ${labelList[0]}`;
      return;
    }
    image.description = `${labelList.length} labels: ${labelList.join(", ")}`;
  }

  updateImageListElement() {
    for (let index = 0; index < this.imageList.length; index++) {
      if (this.imageList[index].element || this.imageList[index].state !== "waiting") {
        continue;
      }
      const container = this.listWrapper.nativeElement.querySelector(`[data-index="${index}"]`);
      if (!(container instanceof HTMLElement)) {
        console.warn("Could not find corresponding image container");
        continue;
      }
      const imageElement = container.querySelector("img");
      const canvasElement = container.querySelector("canvas");
      if (!(imageElement instanceof HTMLImageElement) && !(canvasElement instanceof HTMLCanvasElement)) {
        console.warn("Could not find corresponding image inner elements");
        continue;
      }
      this.imageList[index].container = container;
      this.imageList[index].element = imageElement;
      this.imageList[index].canvas = canvasElement;
      this.imageList[index].state = "loading";
      imageElement.onload = this.onImageFinishLoading.bind(this, this.imageList[index]);
      imageElement.src = this.imageList[index].src;
    }
    const hasWaitingImage = this.imageList.some((imageDesc) => imageDesc.state === "waiting");
    if (hasWaitingImage) {
      this.imageInsertTimer = setTimeout(this.updateImageListElement.bind(this), 500);
    }
  }

  insertImage(fileDesc: RawFileDescriptor) {
    this.imageList.push({
      element: null,
      state: "waiting",
      src: fileDesc.url,
      name: fileDesc.name,
    });
    this.imageInsertTimer = setTimeout(this.updateImageListElement.bind(this), 200);
  }

}
