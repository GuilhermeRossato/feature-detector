import { Component, OnInit } from '@angular/core';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';

@Component({
  selector: 'app-image-list-view',
  templateUrl: './image-list-view.component.html',
  styleUrls: ['./image-list-view.component.css']
})
export class ImageListViewComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  insertImage(fileDesc: RawFileDescriptor) {
    console.log("hello");
  }

}
