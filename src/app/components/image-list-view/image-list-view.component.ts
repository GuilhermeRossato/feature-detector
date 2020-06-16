import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter, OnChanges, SimpleChanges, Input } from '@angular/core';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';
import { ImageService } from 'src/app/services/image.service';

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
  description?: string,
  selected: boolean;
  offset: {x: number, y: number},
  fileDesc: RawFileDescriptor
}

@Component({
  selector: 'app-image-list-view',
  templateUrl: './image-list-view.component.html',
  styleUrls: ['./image-list-view.component.css']
})
export class ImageListViewComponent implements OnChanges {

  public imageList: ImageEntry[] = [];
  private imageInsertTimer: any;
  private hasSentSelectedImage = false;

  @Input() fileList: RawFileDescriptor[];
  @Output() removeImageAction = new EventEmitter<{canvas: HTMLCanvasElement, url: string, id: number, left: number}>();
  @Output() selectCanvasAction = new EventEmitter<{canvas: HTMLCanvasElement, x: number, y: number}>();
  @Output() requestImageClick = new EventEmitter<void>();
  @Output() addCanvasAction = new EventEmitter<{canvas: HTMLCanvasElement, file: RawFileDescriptor}>();
  @ViewChild("listWrapper") listWrapper: ElementRef<HTMLDivElement>;

  constructor(
    private appendedImage: ImageService
  ) { }

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
    canvasElement.setAttribute("data-filename", image.name);
    image.ctx = canvasElement.getContext("2d");
    image.ctx.drawImage(image.element, 0, 0, image.width, image.height);
    image.element = null;
    image.state = "loaded";
    const hasWaitingImage = this.imageList.some((imageDesc) => imageDesc.state === "waiting");
    if (!hasWaitingImage && !this.hasSentSelectedImage) {
      setTimeout(() => this.sendRandomSelection(), 10);
    }
    this.initializeDescription(image);
    this.addCanvasAction.emit({canvas: canvasElement, file: image.fileDesc});
  }

  public onMouseOut(event: MouseEvent, canvas: HTMLCanvasElement, image: ImageEntry, id: number) {
    image.offset = {x: 0, y: 0};
    canvas.style.transform = "";
  }

  public onMouseMove(event: MouseEvent, canvas: HTMLCanvasElement, image: ImageEntry, id: number) {
    const parentRect = canvas.parentElement.getBoundingClientRect();
    const isLargeImage = (canvas.width > parentRect.width * 1.5 || canvas.height > parentRect.height * 1.5)
    const zoom = isLargeImage ? 1 : 0.5;

    if (isLargeImage) {
      const x = (event.clientX - parentRect.left + 0.5) * zoom;
      const y = (event.clientY - parentRect.top) * zoom - 0.5;
      image.offset = {
        x: (canvas.width - parentRect.width - 2) * (0.5 - x / parentRect.width),
        y: (canvas.height - parentRect.height - 2) * (0.5 - y / parentRect.height)
      }
    }
    canvas.style.transform = `scale(${1/zoom}) translate(${image.offset.x.toFixed(3)}px, ${image.offset.y.toFixed(3)}px)`;
  }

  public onImageClick(event: MouseEvent, canvas: HTMLCanvasElement, image: ImageEntry, id: number) {
    if (image.canvas !== canvas) {
      console.warn("Updated canvas");
      image.canvas = canvas;
    }
    const rect = canvas.getBoundingClientRect();
    const parentRect = canvas.parentElement.getBoundingClientRect();
    const isLargeImage = (canvas.width > parentRect.width || canvas.height > parentRect.height)
    const zoom = isLargeImage ? 1 : 0.5;
    const x = (event.clientX - rect.left + 0.5) * zoom;
    const y = (event.clientY - rect.top) * zoom - 0.5;

    this.hasSentSelectedImage = true;
    this.selectCanvasAction.emit({canvas, x, y});
  }

  private sendRandomSelection() {
    let image: ImageEntry;
    if (this.imageList.length <= 0) {
      return;
    }
    let limit = 100;
    let imageId;
    while (limit > 0 && (!image || !image.canvas || !image.canvas.width || !image.labelList)) {
      imageId = Math.random() * this.imageList.length | 0;
      image = this.imageList[imageId];
      limit--;
    }
    if (!image || !image.canvas || !image.canvas.width) {
      return;
    }
    let x = (0.25 + 0.5*Math.random()) * image.canvas.width | 0;
    let y = (0.25 + 0.5*Math.random()) * image.canvas.height | 0;

    this.hasSentSelectedImage = true;
    this.selectCanvasAction.emit({canvas: image.canvas, x, y});
  }

  public onRemoveClick(button: HTMLButtonElement, image: ImageEntry, id: number) {
    if (this.imageList.length <= 1) {
      this.removeImageAction.emit({ url: this.imageList[0].src, canvas: this.imageList[0].canvas, id: 0, left: 0 });
      this.imageList = [];
      return;
    }
    this.removeImageAction.emit({ url: image.src, canvas: image.canvas, id: id, left: this.imageList.length - 1 });
    this.imageList.splice(id, 1);
  }

  private initializeDescription(image: ImageEntry) {
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

  private updateImageListElement() {
    this.imageInsertTimer = null;
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
      if (this.imageInsertTimer) {
        clearTimeout(this.imageInsertTimer);
      }
      this.imageInsertTimer = setTimeout(this.updateImageListElement.bind(this), 500);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.fileList) {
      this.onFileListChanged();
    }
  }

  onFileListChanged() {
    for (let i = 0; i < this.fileList.length; i++) {
      let image = this.imageList.find(image => image.fileDesc == this.fileList[i]);
      if (image) {
        continue;
      }
      this.onInsertImage(this.fileList[i]);
    }
  }

  private onInsertImage(fileDesc: RawFileDescriptor) {
    this.imageList.push({
      element: null,
      state: "waiting",
      src: fileDesc.url,
      name: fileDesc.name,
      selected: false,
      offset: {x: 0, y: 0},
      fileDesc: fileDesc
    });
    if (this.imageInsertTimer) {
      clearTimeout(this.imageInsertTimer);
    }
    this.imageInsertTimer = setTimeout(this.updateImageListElement.bind(this), 200);
  }

  onAddImageClick() {
    this.requestImageClick.emit();
  }

}
