import { Component, OnInit, Output, EventEmitter } from '@angular/core';

export interface RawFileDescriptor {
  name: string,
  url: string,
  size: number
}

@Component({
  selector: 'app-file-dropper',
  templateUrl: './file-dropper.component.html',
  styleUrls: ['./file-dropper.component.css']
})
export class FileDropperComponent implements OnInit {

  @Output() imageAdded = new EventEmitter<RawFileDescriptor>();

  constructor() { }

  ngOnInit(): void {
  }

  onFileSelect(event: Event, target: HTMLInputElement) {
    const files = target.files;

    for (let i = files.length-1; i >= 0; i--) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (e) => {
        const url = e.target.result;
        if (typeof url !== "string" || !url) {
          throw new Error(`Unexpected URL when opening file "${file.name}"`);
        }
        const descriptor = {
          name: file.name,
          url: url,
          size: file.size
        }
        this.imageAdded.emit(descriptor);
      }

      reader.readAsDataURL(file);
    }
  }

  onDragOver(event: Event, dataTransfer: DataTransfer) {
    event.stopPropagation();
    event.preventDefault();
    dataTransfer.dropEffect = 'copy';
  }
}
