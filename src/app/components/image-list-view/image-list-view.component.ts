import { Component, OnInit } from '@angular/core';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';

@Component({
  selector: 'app-image-list-view',
  templateUrl: './image-list-view.component.html',
  styleUrls: ['./image-list-view.component.css']
})
export class ImageListViewComponent implements OnInit {

  private imageList: HTMLImageElement[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  private onImageFinishLoading(image: HTMLImageElement) {
  }

  insertImage(fileDesc: RawFileDescriptor) {
    const image = new Image();
    image.name = fileDesc.name;
    image.onload = this.onImageFinishLoading.bind(this, image);
    image.src = fileDesc.url;
    this.imageList.push(image);
  }

}
