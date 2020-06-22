import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BrushService } from 'src/app/services/brush.service';
import { ImageService } from 'src/app/services/image.service';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';
import { NetworkConfiguration } from '../network-configurator/network-configurator.component';
import { NeuralService } from 'src/app/services/neural.service';

@Component({
  selector: 'app-network-review',
  templateUrl: './network-review.component.html',
  styleUrls: ['./network-review.component.css']
})
export class NetworkReviewComponent implements OnChanges {

  @Input() config: NetworkConfiguration;

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
  public smallestFeatureCount: number;
  public smallestFeatureName: string;
  public biggestFeatureCount: number;
  public biggestFeatureName: string;
  public featureCount: number = null;
  public totalDatasetSize: number = null;
  public validationDatasetSize: number = null;

  constructor(
    private brushService: BrushService,
    private imageService: ImageService,
    private neuralService: NeuralService
  ) { }

  thousandsSeparators(num: number, separator = ","): string {
    if (typeof num !== 'number') {
      return '?';
    }
    let numParts = num.toString().split('.');
    numParts[0] = numParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return numParts.join('.');
  };

  private digestNetworkConfig() {
    if (!this.config) {
      this.inputPixels = null;
      this.inputs = null;
      return;
    }
    const pixels = this.brushService.getBrushPixels(this.config.brushSize, this.config.brushSpacing, this.config.brushShape);
    this.inputPixels = pixels.length;
    this.inputs = pixels.length * this.neuralService.getInputMultiplierFromFormat(this.config.inputFormat);
    this.outputs = this.getUniqueLabelList().size;
  }

  private digestImageList() {
    if (!this.fileList) {
      this.images = 0;
      this.featurePixels = 0;
      this.outputs = null;
      return;
    }
    this.images = this.fileList.length;
    const uniqueLabelList = this.getUniqueLabelList();
    let featurePixels = 0;
    let smallestFeatureCount: number = null;
    let smallestFeatureName: string = null;
    let biggestFeatureCount: number = null;
    let biggestFeatureName: string = null;
    const featureRecord = this.imageService.getAggregatedFeatureLabelCountList(this.fileList);

    this.featureCount = 0;
    for (let key in featureRecord) {
      if (!uniqueLabelList.has(key)) {
        continue;
      }
      this.featureCount++;
      if (typeof featureRecord[key] !== "number") {
        console.warn(`Unknown feature record property ${key} of type ${typeof featureRecord[key]}`);
        continue;
      }
      featurePixels += featureRecord[key];
      if (smallestFeatureCount === null || featureRecord[key] < smallestFeatureCount) {
        smallestFeatureCount = featureRecord[key];
        smallestFeatureName = key;
      }
      if (biggestFeatureCount === null || featureRecord[key] > biggestFeatureCount) {
        biggestFeatureCount = featureRecord[key];
        biggestFeatureName = key;
      }
    }
    this.smallestFeatureCount = smallestFeatureCount;
    this.smallestFeatureName = smallestFeatureName;
    this.biggestFeatureCount = biggestFeatureCount;
    this.biggestFeatureName = biggestFeatureName;
    this.featurePixels = featurePixels;
    this.outputs = uniqueLabelList.size;
  }

  private getUniqueLabelList() {
    if (this.config && this.config.outputList instanceof Array) {
      return new Set<string>(this.config.outputList.filter(output => output.include).map(output => output.label));
    }
    return this.imageService.getUniqueLabelListFromFiles(this.fileList);
  }

  get distribution() {
    if (!this.config || (this.config && typeof this.config.distributedFeatures !== "string")) {
      return 'no-redistribution';
    }
    return this.config.distributedFeatures;
  }

  getTotalDatasetSize() {
    if (!this.config || typeof this.usableFeatureCount !== "number") {
      return null;
    } else if (this.distribution === "no-redistribution" || typeof this.smallestFeatureCount !== "number") {
      return this.usableFeatureCount + this.nonFeatureCount;
    } else if (this.distribution === "distribute-features" || this.nonFeatureCount <= this.smallestFeatureCount) {
      return this.smallestFeatureCount * this.featureCount + this.nonFeatureCount;
    } else if (this.distribution === "distribute-all" && this.nonFeatureCount > this.smallestFeatureCount) {
      return this.smallestFeatureCount * (this.featureCount + 1);
    }
  }

  private onAfterUpdatedValues() {
    this.trainingTime = 1;
    let connections = null;
    if (this.config && this.config.hiddenLayerCount && typeof this.inputs === "number") {
      connections = this.inputs * this.config.hiddenNeuronCount;
      connections += this.config.hiddenNeuronCount * this.config.hiddenNeuronCount * (this.config.hiddenLayerCount - 1);
      connections += this.outputs * this.config.hiddenNeuronCount;
      connections += this.config.hiddenLayerCount; // Biases
    } else if (typeof this.inputs === "number" && typeof this.outputs === "number") {
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
    this.totalDatasetSize = this.getTotalDatasetSize();
    if (this.config && typeof this.config.validationPercent === "number") {
      this.validationDatasetSize = Math.floor(this.totalDatasetSize * this.config.validationPercent / 100);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.config || changes.fileList) {
      this.digestNetworkConfig();
      this.digestImageList();
    }
    this.onAfterUpdatedValues();
  }

}
