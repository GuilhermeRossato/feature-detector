import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';

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
};

@Component({
  selector: 'app-network-configurator',
  templateUrl: './network-configurator.component.html',
  styleUrls: ['./network-configurator.component.css']
})
export class NetworkConfiguratorComponent implements OnInit {

  @Input() selection: {canvas: HTMLCanvasElement, x: number, y: number} = null;
  @Output() configChange = new EventEmitter<NetworkConfiguration>();

  public brushSize: number = 15;
  public brushSpacing: number = 2;
  public brushShape: "square" | "circle" | "diamond" = "circle";
  public inputFormat: "rgb" | "hsl" | "r" | "g" | "b" | "rg" | "rb" | "grayscale" = "rgb";

  public hiddenLayerCount: number = 2;
  public hiddenNeuronCount: number = 17;
  public activationFunction: string = 'sigmoid';
  public epochCount: number = 10000;
  public featureDatasetPercent: number = 100;
  public nonFeaturePercent: number = 50;

  constructor() {}

  ngOnInit() {}

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
    } else {
      console.warn("Unhandled input", name);
    }
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
    });
  }

}
