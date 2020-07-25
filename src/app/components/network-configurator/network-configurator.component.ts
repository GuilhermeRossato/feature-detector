import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ImageService } from 'src/app/services/image.service';

export interface NetworkConfiguration {
  brushSize: number,
  brushSpacing: number,
  brushShape: "square" | "circle" | "diamond",
  inputFormat: "rgb" | "hsl" | "r" | "g" | "b" | "rg" | "rb" | "grayscale",
  hiddenLayerCount: number,
  hiddenNeuronCount: number,
  activationFunction: "sigmoid" | "relu" | "leaky-relu" | "tanh",
  epochCount: number;
  featureDatasetPercent: number;
  nonFeaturePercent: number;
  validationPercent: number;
  distributedFeatures: 'no-redistribution' | 'distribute-features' | 'distribute-all';
  outputList: {label: string, include?: boolean}[];
};

@Component({
  selector: 'app-network-configurator',
  templateUrl: './network-configurator.component.html',
  styleUrls: ['./network-configurator.component.css']
})
export class NetworkConfiguratorComponent implements OnInit, OnChanges {

  @Input() selection: {canvas: HTMLCanvasElement, x: number, y: number} = null;
  @Input() fileList: {canvas: HTMLCanvasElement, fileDesc: RawFileDescriptor}[];
  @Output() configChange = new EventEmitter<NetworkConfiguration>();

  public brushSize: number = 15;
  public brushSpacing: number = 2;
  public brushShape: "square" | "circle" | "diamond" = "circle";
  public inputFormat: "rgb" | "hsl" | "r" | "g" | "b" | "rg" | "rb" | "grayscale" = "rgb";
  public hiddenLayerCount: number = 0;
  public hiddenNeuronCount: number = 16;
  public activationFunction: string = 'sigmoid';
  public epochCount: number = 1000;
  public featureDatasetPercent: number = 100;
  public nonFeaturePercent: number = 50;
  public validationPercent: number = 15;
  public distributedFeatures: 'no-redistribution' | 'distribute-features' | 'distribute-all' = 'no-redistribution';
  public outputList: {label: string, include?: boolean}[] = [];

  private changeEmissionTimer: any;
  private hasSentFirstConfigChange = false;

  constructor(
    private localStorage: LocalStorageService,
    private imageService: ImageService
  ) {}

  ngOnInit() {
    if (!this.hasSentFirstConfigChange) {
      this.emitConfigChangeDebounced();
    }
  }

  onFileListUpdate() {
    for (let {canvas} of this.fileList) {
      if (!canvas) {
        continue;
      }
      const labelList = this.imageService.getLabelListFromCanvas(canvas, null, false);
      if (!labelList) {
        continue;
      }
      for (let label of labelList) {
        const output = this.outputList.find(output => output.label === label);
        if (output) {
          continue;
        }
        const key = `vfd-include-label-${(this.outputList.length).toString()}`;
        const include = this.localStorage.getItem(key) !== '0';
        this.outputList.push({label, include});
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.fileList) {
      this.onFileListUpdate();
    }
  }

  onInputChange(name: string, value: string) {
    if (typeof name === typeof undefined || typeof value === typeof undefined) {
      throw new Error("Invalid input change parameters");
    }
    if (name === "brush-size") {
      this.brushSize = parseInt(value, 10);
    } else if (name === "brush-spacing") {
      this.brushSpacing = parseInt(value, 10);
    } else if (name === "brush-shape") {
      this.brushShape = value as any;
    } else if (name === "input-format") {
      this.inputFormat = value as any;
    } else if (name === "hidden-layer-count") {
      this.hiddenLayerCount = parseInt(value, 10);
    } else if (name === "hidden-layer-neuron-count") {
      this.hiddenNeuronCount = parseInt(value, 10);
    } else if (name === "activation-function") {
      this.activationFunction = value;
    } else if (name === "epoch-count") {
      this.epochCount = parseInt(value, 10);
    } else if (name === "feature-dataset-percent") {
      this.featureDatasetPercent = parseInt(value, 10);
    } else if (name === "non-feature-percent") {
      this.nonFeaturePercent = parseInt(value, 10);
    } else if (name === "validation-percent") {
      this.validationPercent = parseInt(value, 10);
    } else if (name === "distributed-features") {
      this.distributedFeatures = value as any;
    } else {
      console.warn("Unhandled input", name);
    }
    this.hasSentFirstConfigChange = true;
    this.emitConfigChangeDebounced();
  }

  onAnnotationIncludeClick(input: HTMLInputElement, index: number) {
    if (!this.outputList[index]) {
      console.warn(`Output list has ${this.outputList.length} items and ${index} is not one of them`);
      return;
    }
    const key = `vfd-include-label-${index.toString()}`;
    if (input.checked) {
      this.localStorage.clearItem(key);
    } else {
      this.localStorage.setItem(key, "0", null);
    }
    this.outputList[index].include = input.checked;
    this.emitConfigChangeDebounced();
  }

  private emitConfigChangeDebounced() {
    if (this.changeEmissionTimer) {
      clearTimeout(this.changeEmissionTimer);
    }
    this.changeEmissionTimer = setTimeout(this.emitConfigChange.bind(this), 50);
  }

  private emitConfigChange() {
    this.changeEmissionTimer = null;
    this.configChange.emit({
      brushSize: this.brushSize,
      brushSpacing: this.brushSpacing,
      brushShape: this.brushShape,
      inputFormat: this.inputFormat,
      hiddenLayerCount: this.hiddenLayerCount,
      hiddenNeuronCount: this.hiddenNeuronCount,
      activationFunction: this.activationFunction as any,
      epochCount: this.epochCount,
      featureDatasetPercent: this.featureDatasetPercent,
      nonFeaturePercent: this.nonFeaturePercent,
      validationPercent: this.validationPercent,
      distributedFeatures: this.distributedFeatures,
      outputList: this.outputList
    });
  }
}
