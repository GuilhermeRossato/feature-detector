import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BrushService } from 'src/app/services/brush.service';
import { ImageService } from 'src/app/services/image.service';

@Component({
  selector: 'app-network-review',
  templateUrl: './network-review.component.html',
  styleUrls: ['./network-review.component.css']
})
export class NetworkReviewComponent implements OnChanges {

  @Input() config: {
    brushSize: number,
    brushSpacing: number,
    brushShape: "circle" | "diamond" | "square",
    inputFormat: "rgb" | "hsl" | "r" | "g" | "b" | "rg" | "rb" | "grayscale",
    hiddenLayerCount: number,
    hiddenNeuronCount: number,
    activationFunction: string,
    epochCount: number
  };

  @Input() imageList: HTMLCanvasElement[];

  public inputPixels = 0;
  public inputs = 0;
  public outputs = 0;
  public connections = 0;
  public weights = 0;
  public trainingTime = 0;
  public images = 0;
  public featurePixels = 0;

  constructor(
    private brushService: BrushService,
    private imageService: ImageService
  ) { }

  private onUpdateNetworkConfig() {
    if (!this.config) {
      this.inputPixels = null;
      this.inputs = null;
      this.weights = null;
      return;
    }
    const pixels = this.brushService.getBrushPixels(this.config.brushSize, this.config.brushSpacing, this.config.brushShape);
    this.inputPixels = pixels.length;
    this.inputs = pixels.length * this.getMultiplierFromFormat(this.config.inputFormat);
  }

  private onUpdateImages() {
    if (!this.imageList) {
      this.outputs = null;
      return;
    }
    this.outputs = this.imageList.reduce((prev, image) => prev + this.imageService.getAnnotationFromCanvas(image).length, 0);
    this.images = this.imageList.length;
  }

  private onAfterUpdatedValues() {
    this.trainingTime = 1;
    this.connections = 0;
    for (let i = 0; i < this.config.hiddenLayerCount; i++) {

    }
  }

  private getMultiplierFromFormat(format: string): number {
    switch (format) {
      case "hsl":
      case "grayscale":
      case "rgb": return 3;
      case "r":
      case "g":
      case "b": return 1;
      case "rg":
      case "rb": return 2;
      default: throw new Error("Unknown format");
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.config) {
      this.onUpdateNetworkConfig();
    }
    if (changes.imageList) {
      this.onUpdateImages();
    }
    this.onAfterUpdatedValues();
  }

}
