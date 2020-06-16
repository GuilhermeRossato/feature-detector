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

  @Output() imageAdded = new EventEmitter<RawFileDescriptor[]>();

  constructor() { }

  ngOnInit(): void {
  }

  async onFileSelect(event: Event, target: HTMLInputElement) {
    const files = target.files;

    const promises: Promise<RawFileDescriptor>[] = [];
    for (let i = files.length-1; i >= 0; i--) {
      const file = files[i];
      promises.push(
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const url = e.target.result;
            if (typeof url !== 'string' || url.length < 100) {
              return reject(new Error(`Unexpected URL when opening file "${file.name}"`));
            }
            return resolve({
              name: file.name,
              url: url,
              size: file.size
            })
          }

          reader.readAsDataURL(file);
        }));
    }
    const imageDescriptorList = await Promise.all(promises);

    target.value = null;
    this.imageAdded.emit(imageDescriptorList.sort((a, b) => a.name > b.name ? 1 : (a.name < b.name ? -1 : 0)));
  }

  onDragOver(event: Event, dataTransfer: DataTransfer) {
    event.stopPropagation();
    event.preventDefault();
    dataTransfer.dropEffect = 'copy';
  }
}
