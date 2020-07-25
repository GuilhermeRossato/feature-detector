import { Injectable } from '@angular/core';
import { RawFileDescriptor } from '../components/file-dropper/file-dropper.component';
import { BrushService } from './brush.service';
import { NetworkConfiguration } from '../components/network-configurator/network-configurator.component';
import { ImageService } from './image.service';

function getHighestValueId(values: number[]) {
  if (!values) {
    return null;
  }
  let highestId = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[highestId]) {
      highestId = i;
    }
  }
  return highestId;
}

@Injectable({
  providedIn: 'root'
})
export class NeuralService {
  private brain: {
    NeuralNetwork: any,
    NeuralNetworkGPU: any
  };

  constructor(
    private brushService: BrushService,
    private imageService: ImageService
  ) {
    // @ts-ignore
    this.brain = brain;
  }

  createDataset(
    fileList: {canvas: HTMLCanvasElement; fileDesc: RawFileDescriptor}[],
    config: NetworkConfiguration,
    includeBorders: boolean,
    outputList: {label: string; include?: boolean}[]
  ) {
    if (typeof config.inputFormat !== "string") {
      throw new Error(`Invalid input format: ${config.inputFormat}`);
    } else if (!config.brushSize || typeof config.brushSpacing !== "number" || !config.brushShape) {
      throw new Error("Missing brush size, spacing or shape");
    } else if (!(fileList instanceof Array) || fileList.length === 0) {
      throw new Error("File list cannot be empty");
    } else if (typeof config.nonFeaturePercent !== "number") {
      throw new Error(`Non feature percent is not a number, got "${typeof config.nonFeaturePercent}"`);
    } else if (typeof config.featureDatasetPercent !== "number") {
      throw new Error(`Feature percent is not a number, got "${typeof config.nonFeaturePercent}"`);
    }
    fileList = fileList.filter(file => !!file.canvas);
    const pixels = this.brushService.getBrushPixels(config.brushSize, config.brushSpacing, config.brushShape);
    const uniqueLabelList = outputList.map(output => output.label);
    let featureCount = 0;
    for (let desc of fileList) {
      if (!desc.canvas) {
        throw new Error("File list cannot contain unloaded images");
      }
      featureCount += this.imageService.getFeaturePixelCount(desc);
    }
    const inputs = pixels.length * this.getInputMultiplierFromFormat(config.inputFormat);
    const outputs = outputList.length;
    const dataset: { input: number[]; output: number[]; }[] = [];
    const expectedFeatureSize = Math.floor(featureCount * (config.featureDatasetPercent / 100));
    // Create the feature dataset
    for (let {canvas} of fileList) {
      if (!canvas) {
        continue;
      }
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height-1);
      const features = this.imageService.getFeaturePixels(canvas, ctx, config.featureDatasetPercent / 100, includeBorders ? config.brushSize : 0);
      const imageLabelList = this.imageService.getLabelListFromCanvas(canvas, ctx, true);

      for (let [fx, fy, labelId] of features) {
        if (dataset.length >= expectedFeatureSize) {
          break;
        }
        const label = imageLabelList[labelId];
        if (!uniqueLabelList.includes(label)) {
          // Skip unselected labels
          continue;
        }
        const inputArray = new Array(inputs);
        let inputIndex = 0;
        const output = new Array(outputs+1).fill(0);
        for (let i = 0; i < uniqueLabelList.length; i++) {
          if (uniqueLabelList[i] === label) {
            output[i] = 1;
            break;
          }
        }
        for (let {x, y} of pixels) {
          inputIndex = this.addFeatureToInputArray(fx + x, fy + y, imageData, config.inputFormat, inputArray, inputIndex);
        }
        if (inputIndex !== inputs) {
          throw new Error(`Resulting input size (${inputIndex}) mismatch expected (${inputs}) with type "${config.inputFormat}"`);
        }
        dataset.push({ input: inputArray, output });
      }
    }

    // Create the non-feature dataset
    const nonFeatureCount = Math.floor(featureCount * (config.nonFeaturePercent / 100));
    const expectedSize = dataset.length + nonFeatureCount;

    const output = new Array(outputs + 1).fill(0);
    for (let {canvas} of fileList) {
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height-1);
      for (let i = 0; i < nonFeatureCount / fileList.length; i++) {
        if (dataset.length >= expectedSize) {
          break;
        }
        // Retries to find the non-feature-pixel up to N times
        for (let j = 0; j < 10; j++) {
          const fx = (Math.random() * (canvas.width - (includeBorders ? config.brushSize : 0))) | 0;
          const fy = (Math.random() * (canvas.height - (includeBorders ? config.brushSize : 0))) | 0;
          const alpha = imageData[(fx + fy * imageData.width) * 4 + 3];
          if (alpha === 255 || alpha < 128) {
            continue;
          }
          const inputArray = new Array(inputs);
          let inputIndex = 0;
          for (let {x, y} of pixels) {
            inputIndex = this.addFeatureToInputArray(fx + x, fy + y, imageData, config.inputFormat, inputArray, inputIndex);
          }
          dataset.push({ input: inputArray, output });
          break;
        }
      }
      if (dataset.length > expectedSize) {
        break;
      }
    }
    // Remove unselected outputs from dataset
    const expectedOutput = config.outputList;
    for (let i = 0; i < dataset.length; i++) {
      const output = [];
      let has_one = 0;
      for (let j = 0; j < expectedOutput.length; j++) {
        if (expectedOutput[j].include) {
          if (dataset[i].output[j] >= 0.5) {
            has_one = 1;
          }
          output.push(dataset[i].output[j]);
        }
      }
      output.push(has_one ? 0 : 1);
      dataset[i].output = output;
    }
    return dataset;
  }

  private addFeatureToInputArray(x: number, y: number, imageData: ImageData, inputFormat: string, inputArray: any[], inputIndex: number) {
    const i = (x + y * imageData.width) * 4;
    let r: number, g: number, b: number;
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
      r = 0;
      g = 0;
      b = 0;
    } else {
      r = imageData.data[i + 0] / 255;
      g = imageData.data[i + 1] / 255;
      b = imageData.data[i + 2] / 255;
    }
    if (inputFormat === "rgb") {
      inputArray[inputIndex++] = r;
      inputArray[inputIndex++] = g;
      inputArray[inputIndex++] = b;
    } else if (inputFormat === "hsl") {
      const [h, s, k] = this.imageService.rgbToHsl(r, g, b);
      inputArray[inputIndex++] = h;
      inputArray[inputIndex++] = s;
      inputArray[inputIndex++] = k;
    } else if (inputFormat === "grayscale") {
      inputArray[inputIndex++] = (r + g + b) / 3;
    } else if (inputFormat === "r") {
      inputArray[inputIndex++] = r;
    } else if (inputFormat === "g") {
      inputArray[inputIndex++] = g;
    } else if (inputFormat === "b") {
      inputArray[inputIndex++] = b;
    } else if (inputFormat === "rg") {
      inputArray[inputIndex++] = r;
      inputArray[inputIndex++] = g;
    } else if (inputFormat === "rb") {
      inputArray[inputIndex++] = r;
      inputArray[inputIndex++] = b;
    }
    return inputIndex;
  }

  getInputMultiplierFromFormat(format: string): number {
    switch (format) {
      case 'hsl':
      case 'rgb': return 3;
      case 'grayscale':
      case 'r':
      case 'g':
      case 'b': return 1;
      case 'rg':
      case 'rb': return 2;
      default: throw new Error('Unknown format');
    }
  }

  getNetworkParameters(
    fileList: {canvas: HTMLCanvasElement, fileDesc: RawFileDescriptor}[],
    config: NetworkConfiguration
  ) {
    if (!config.brushSize || typeof config.brushSpacing !== "number" || !config.brushShape) {
      throw new Error("Missing brush size, spacing or shape");
    }
    const pixels = this.brushService.getBrushPixels(config.brushSize, config.brushSpacing, config.brushShape);
    let hiddenLayers: number[] = [];
    if (typeof config.hiddenLayerCount !== "number") {
      throw new Error(`Invalid hidden neuron count: ${config.hiddenNeuronCount}`);
    }
    for (let i = 0; i < config.hiddenLayerCount; i++) {
      hiddenLayers.push(config.hiddenNeuronCount);
    }
    if (!config.inputFormat) {
      throw new Error(`Unexpected input format: ${config.inputFormat}`);
    }
    const inputSize = pixels.length * this.getInputMultiplierFromFormat(config.inputFormat);
    // const fullLabelList = [...this.imageService.getUniqueLabelListFromFiles(fileList)];
    const labelList = config.outputList.filter(output => output.include).map(output => output.label);
    const outputSize = labelList.length;

    return {
      inputSize,
      hiddenLayers: hiddenLayers,
      outputSize,
      labelList
    };
  }

  isSameNetwork(network: any, fileList: { canvas: HTMLCanvasElement; fileDesc: RawFileDescriptor; }[], config: NetworkConfiguration) {
    const {inputSize, hiddenLayers, outputSize, labelList} = this.getNetworkParameters(fileList, config);

    if (network._fd_labelList.length !== labelList.length) {
      console.log("LabelList is different");
      return false;
    } else if (network._fd_activation !== config.activationFunction) {
      console.log("Activation function is different");
      return false;
    } else if (network._fd_inputSize !== inputSize) {
      console.log("InputSize function is different");
      return false;
    } else if (network._fd_outputSize !== outputSize) {
      console.log("OutputSize function is different");
      return false;
    } else if (network._fd_hiddenLayers !== hiddenLayers.join(",")) {
      console.log("HiddenLayers function is different");
      return false;
    }

    return true;
  }

  createNetwork(
    fileList: {canvas: HTMLCanvasElement, fileDesc: RawFileDescriptor}[],
    config: NetworkConfiguration
  ) {
    const {inputSize, hiddenLayers, outputSize, labelList} = this.getNetworkParameters(fileList, config);

    // Create an example dataset to start the network
    const initOutput = new Array(outputSize+1).fill(0);
    initOutput[outputSize] = 1;
    const dataset = [{
      input: new Array(inputSize).fill(0),
      output: initOutput
    }];

    // console.log({inputSize, hiddenLayers, outputSize, labelList, initOutput});

    let network: any;
    try {
      network = new this.brain.NeuralNetworkGPU({
        activation: config.activationFunction,
        hiddenLayers
      });
      network.train(dataset, { learningRate: 0.25, iterations: 10 });
      network.test(dataset);
    } catch (err) {
      console.warn("GPU Failure: " + err);
      console.log("GPU Neural Network creation failed, falling back to CPU Neural Network");
      network = new this.brain.NeuralNetwork({
        activation: config.activationFunction,
        hiddenLayers,
      });
      network.train(dataset, { learningRate: 0.25, iterations: 10 });
      network.test(dataset);
    }
    // Injecting just because we are not dealing with a well-typescript-ed library, I know it's wrong.
    network._fd_labelList = labelList;
    network._fd_activation = config.activationFunction;
    network._fd_inputSize = inputSize;
    network._fd_outputSize = outputSize;
    network._fd_hiddenLayers = hiddenLayers.join(",");
    return network;
  }

  trainNetwork(network: any, dataset: { input: number[]; output: number[]; }[], iterations: number): {error: number} {
    return network.train(dataset, {iterations, activation: network._fd_activation});
  }

  testNetwork(network: any, dataset: { input: number[]; output: number[]; }[]): {
      error: number;
      misclasses: number;
      accuracy: number;
      incorrectCount: Record<string, number>;
      total: number;
  } {
    const labelList: string[] = network._fd_labelList;
    for (let i = 0; i < dataset.length; i++) {
      const result = network.runInput(dataset[i].input);

    }
    return {error: 0, misclasses: 0, accuracy: 0, incorrectCount: null, total: 0};
    /*

    const testResult = network.test(dataset);

    const error: number = testResult.error;
    const misclasses: number = testResult.misclasses.length;
    const accuracy: number = 1 - misclasses / testResult.total;

    const incorrectCount: Record<string, number> = {};
    for (let { actual, expected } of testResult.misclasses) {
      const label = labelList[expected];
      if (typeof incorrectCount[label] !== "number") {
        incorrectCount[label] = 1;
      } else {
        incorrectCount[label]++;
      }
    }
    return {
      error,
      misclasses,
      accuracy,
      incorrectCount,
      total: testResult.total as number
    }
    */
  }

  avaliateGuesses(network: any, dataset: { input: number[]; output: number[]; }[]) {
    const accumulated = {
      correct: 0,
      incorrect: 0
    };
    const guesses = {
      correct: [],
      incorrect: []
    };
    for (let unit of dataset) {
      const result = network.runInput(unit.input);
      const outputId = getHighestValueId(result);
      const expectedId = getHighestValueId(unit.output);
      if (outputId === expectedId) {
        guesses.correct[outputId] = (typeof guesses.correct[outputId] === "number" ? guesses.correct[outputId] : 0) + 1;
        accumulated.correct++;
      } else {
        guesses.incorrect[outputId] = (typeof guesses.incorrect[outputId] === "number" ? guesses.incorrect[outputId] : 0) + 1;
        accumulated.incorrect++;
      }
    }
    return {
      accumulated,
      guesses
    };
  }
}
