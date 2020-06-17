import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BrushService } from 'src/app/services/brush.service';
import { ImageService } from 'src/app/services/image.service';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';

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
    epochCount: number,
    featureDatasetPercent: number,
    nonFeaturePercent: number
  };

  @Input() fileList: {canvas: HTMLCanvasElement, fileDesc: RawFileDescriptor}[];

  public inputPixels = 0;
  public inputs = 0;
  public outputs = 0;
  public connections = 0;
  public trainingTime = 0;
  public images = null;
  public featurePixels = null;
  public usableFeatureCount = null;
  public nonFeatureCount = null;

  constructor(
    private brushService: BrushService,
    private imageService: ImageService
  ) { }

  thousandsSeparators(num: number, separator = ","): string {
    if (typeof num !== 'number') {
      return '?';
    }
    let numParts = num.toString().split('.');
    numParts[0] = numParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return numParts.join('.');
  };

  private onUpdateNetworkConfig() {
    if (!this.config) {
      this.inputPixels = null;
      this.inputs = null;
      return;
    }
    const pixels = this.brushService.getBrushPixels(this.config.brushSize, this.config.brushSpacing, this.config.brushShape);
    this.inputPixels = pixels.length;
    this.inputs = pixels.length * this.getMultiplierFromFormat(this.config.inputFormat);
  }

  private onUpdateImages() {
    if (!this.fileList) {
      this.outputs = null;
      this.images = 0;
      this.featurePixels = 0;
      return;
    }
    this.images = this.fileList.length;
    const uniqueLabelList = new Set<string>();
    let featureCount = 0;
    for (let desc of this.fileList) {
      const image = desc.canvas;
      if (!image) {
        continue;
      }
      const labelList = this.imageService.getAnnotationFromCanvas(image, null, false);
      for (let label of labelList) {
        uniqueLabelList.add(label);
      }
      if (labelList.length) {
        const countList = this.imageService.getFeatureLabelCountList(image);
        // console.log(featureCount, countList, countList.length);
        if (countList) {
          for (let i = 0; i < countList.length; i++) {
            const count = countList[i];
            featureCount += isNaN(count) ? 0 : count;
          }
        }
      }
    }
    this.featurePixels = featureCount;
    this.outputs = uniqueLabelList.size;

  }

  private onAfterUpdatedValues() {
    this.trainingTime = 1;
    let connections = 0;
    if (this.config && this.config.hiddenLayerCount) {
      connections = this.inputs * this.config.hiddenNeuronCount;
      connections += this.config.hiddenNeuronCount * this.config.hiddenNeuronCount * (this.config.hiddenLayerCount - 1);
      connections += this.outputs * this.config.hiddenNeuronCount;
      connections += this.config.hiddenLayerCount; // Biases
    } else {
      connections = this.inputs * this.outputs;
    }
    if (this.config && typeof this.featurePixels === "number" && typeof this.config.featureDatasetPercent === "number" && !isNaN(this.config.featureDatasetPercent)) {
      this.usableFeatureCount = Math.floor(this.featurePixels * (this.config.featureDatasetPercent / 100));
    } else {
      this.usableFeatureCount = null;
    }
    if (this.config && typeof this.featurePixels === "number" && typeof this.config.nonFeaturePercent === "number" && !isNaN(this.config.nonFeaturePercent)) {
      this.nonFeatureCount = Math.floor(this.featurePixels * (this.config.nonFeaturePercent / 100));
    } else {
      this.nonFeatureCount = null;
    }
    this.connections = connections;
  }

  private getMultiplierFromFormat(format: string): number {
    switch (format) {
      case 'hsl':
      case 'grayscale':
      case 'rgb': return 3;
      case 'r':
      case 'g':
      case 'b': return 1;
      case 'rg':
      case 'rb': return 2;
      default: throw new Error('Unknown format');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.config) {
      this.onUpdateNetworkConfig();
    }
    if (changes.fileList) {
      this.onUpdateImages();
    }
    this.onAfterUpdatedValues();
  }

}
