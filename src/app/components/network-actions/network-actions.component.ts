import { Component, OnInit, Input } from '@angular/core';
import { NeuralService } from 'src/app/services/neural.service';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';
import { NetworkConfiguration } from '../network-configurator/network-configurator.component';
import { sleep } from 'src/app/utils/sleep';
import { shuffle } from 'src/app/utils/shuffle';
import { ModalService } from 'src/app/services/modal';

interface TextStep {
  type: "text";
  memory?: number;
  label: string;
  date: Date;
}

interface ProgressStep {
  type: "progress";
  memories: number[];
  percents: number[];
  accuracies: number[];
  maxPercent: number;
  startDate: Date;
  date: Date;
}

function detectTextStep(step: any): step is TextStep  {
  return step.type === "text" && typeof step.label === "string" && step.date instanceof Date;
}

function detectProgressStep(step: any): step is ProgressStep  {
  return step.type === "progress" && step.accuracies instanceof Array && step.percents instanceof Array;
}

@Component({
  selector: 'app-network-actions',
  templateUrl: './network-actions.component.html',
  styleUrls: ['./network-actions.component.css']
})
export class NetworkActionsComponent implements OnInit {

  @Input() config: NetworkConfiguration;

  @Input() fileList: {canvas: HTMLCanvasElement, fileDesc: RawFileDescriptor}[];

  public includeBorderOnDataset = true;
  public error: Error = null;
  public steps: (TextStep|ProgressStep)[] = [];
  public network: any;
  public dataset: {
    train: { input: number[]; output: number[]; }[];
    test: { input: number[]; output: number[]; }[]
  } = null;
  public training: boolean;
  public hasTrained = false;
  public outputRecord: Record<number, string> = {0: "chicken", 1: "door", 2: "gate"};
  private haltTraining: boolean;

  constructor(
    private neuralService: NeuralService,
    private modalService: ModalService
  ) { }

  get outputRecordAsString() {
    let txt = "";
    for (let key in this.outputRecord) {
      txt += `${(txt !== "")?", ":""}${key}: ${this.outputRecord[key]}`;
    }
    return txt;
  }

  ngOnInit(): void {
  }

  onIncludeBorderChange({name, value}: {name: string, value: 'true' | 'false'}) {
    this.includeBorderOnDataset = value === 'true';
  }

  getMemoryUsage() {
    if (typeof window.performance !== "object") {
      return null;
      // @ts-ignore
    } else if (typeof window.performance.memory !== "object") {
      return null;
      // @ts-ignore
    } else if (typeof window.performance.memory.usedJSHeapSize !== "number") {
      return null;
      // @ts-ignore
    } else if (typeof window.performance.memory.jsHeapSizeLimit !== "number") {
      return null;
    }
    // @ts-ignore
    return window.performance.memory.usedJSHeapSize/window.performance.memory.jsHeapSizeLimit;
  }

  addStep(label: string) {
    this.steps.push({
      type: "text",
      memory: this.getMemoryUsage(),
      date: new Date(),
      label
    });
  }

  addProgress(percent: number, accuracy: number) {
    let index = -1;
    for (index = 0; index < this.steps.length; index++) {
      if (this.steps[index].type === "progress") {
        break;
      }
    }
    if (index < 0 || index >= this.steps.length) {
      this.steps.push({
        type: "progress",
        memories: [this.getMemoryUsage()],
        percents: [percent],
        accuracies: [accuracy],
        maxPercent: percent,
        startDate: new Date(),
        date: null
      });
    } else {
      const step = this.steps[index];
      if (!detectProgressStep(step)) {
        throw new Error("Invalid progress step");
      }
      step.memories.push(this.getMemoryUsage());
      step.percents.push(percent);
      step.accuracies.push(accuracy);
      step.maxPercent = percent;
      step.date = new Date();
    }
  }

  getTrainingStepIndex() {
    let index = -1;
    for (index = 0; index < this.steps.length; index++) {
      if (this.steps[index].type === "progress") {
        break;
      }
    }
    return index;
  }

  getAccuracyGraphPolylineString(requestedSize: number) {
    let index = this.getTrainingStepIndex();
    const step = this.steps[index];
    if (!step || !detectProgressStep(step)) {
      throw new Error("Invalid progress step");
    }
    const size = Math.min(requestedSize, step.accuracies.length);

    let s: [number, number][] = [];
    for (let i = 0; i < size; i++) {
      const xNorm = i / (size - 1);
      const yNorm = step.accuracies[i];
      const x = xNorm * (300 - 15);
      const y = (1 - yNorm) * (200 - 15);
      s.push([x, y]);
    }
    return s.map(([x, y]) => (x+15).toFixed(1) + " " + y.toFixed(1)).join(",");
  }

  getAccuracyLabelArray(requestedSize: number) {
    let index = this.getTrainingStepIndex();
    const step = this.steps[index];
    if (!step || !detectProgressStep(step)) {
      throw new Error("Invalid progress step");
    }
    const size = Math.min(requestedSize, step.accuracies.length);

    let s: {x: number, y: number, acc: number}[] = [];
    for (let i = 0; i < size; i++) {
      const xNorm = i / (size - 1);
      const yNorm = step.accuracies[i];
      const x = xNorm * (300 - 15);
      const y = (1 - yNorm) * (200 - 15);
      const obj = {x, y: y - 5, acc: step.accuracies[i]};
      if (obj.y < 8) {
        obj.y = y + 11;
      }
      if (i > 1 && x > 35 && (s.length === 0 || Math.abs(s[s.length-1].x - x) >= 45)) {
        s.push(obj);
      } else if (i + 1 === size) {
        obj.x = 300-15;
        s[s.length-1] = obj;
      }
    }
    return s;
  }

  getTrainingSecondsFromProgressStep() {
    let index = this.getTrainingStepIndex();
    const step = this.steps[index];
    if (!step || !detectProgressStep(step)) {
      throw new Error("Invalid progress step");
    }
    return (step.date.getTime() - step.startDate.getTime())/1000;
  }

  getTimeString(index: number) {
    const step = this.steps[index];
    if (!detectTextStep(step)) {
      return "?";
    } else if (!detectTextStep(this.steps[0])) {
      throw new Error("First training step must be a label to let the user know that the training started");
    }
    if (index === 0) {
      return "at " + step.date.toLocaleTimeString();
    }
    const previous = this.steps[index-1];
    if (!previous) {
      return "?";
    }

    const seconds = (step.date.getTime() - previous.date.getTime()) / 1000;
    if (seconds <= 0.3) {
      return "";
    } else if (seconds === 1) {
      return `in 1 second`;
    } else if (seconds < 10) {
      return `in ${seconds.toFixed(1)} seconds`;
    } else if (seconds < 60) {
      return `in ${seconds.toFixed(0)} seconds`;
    } else if (seconds < 60 * 60) {
      return `in ${(seconds / (60)).toFixed(1)} minutes`;
    } else {
      return `in ${Math.floor(seconds / (60 * 60)).toFixed(0)} ${Math.floor(seconds / (60 * 60)) === 1 ? "hour" : "hours"} and ${((seconds / 60) % 60)} minutes`;
    }
  }

  /**
   * Step 1 - Communicate that the training is starting
   */
  private async step1() {
    this.steps = [];
    this.addStep(this.network ? "Restarted training" : "Started training");
    await sleep(16);
    if (this.haltTraining) {
      throw new Error("Training halted by user");
    }
  }

  private redistributeTrainDataset(trainDataset: {input: number[], output: number[]}[]) {
    const startSize = trainDataset.length;
    // Build label record
    const labelRecord: Record<string, number> = {};
    for (let { output } of trainDataset) {
      const key = output.join("");
      if (typeof labelRecord[key] !== "number") {
        labelRecord[key] = 1;
      } else {
        labelRecord[key]++;
      }
    }
    // Find smallest label record
    let emptyRecordKey = null;
    let smallestRecordKey = null;
    let smallestRecordValue = null;
    for (let key in labelRecord) {
      if (key[key.length-1] === "1") {
        // Mark "empty" key for later
        emptyRecordKey = key;
        // Skip "empty" as we don't want to limit the dataset by empty amount
        continue;
      }
      if (smallestRecordKey === null || labelRecord[key] < smallestRecordValue) {
        smallestRecordValue = labelRecord[key];
        smallestRecordKey = key;
      }
    }
    const labelLimitRecord: Record<string, number> = {};
    const result = trainDataset.filter((data) => {
      const key = data.output.join("");
      if (typeof labelLimitRecord[key] !== "number") {
        labelLimitRecord[key] = 1;
        return true;
      } else if (labelLimitRecord[key] >= smallestRecordValue && (key !== emptyRecordKey || this.config.distributedFeatures === "distribute-all")) {
        return false;
      } else {
        labelLimitRecord[key]++;
        return true;
      }
    });
    this.addStep(`Redistribution removed ${(startSize - trainDataset.length)} dataset entries`);
    return result;
  }

  /**
   * Step 2 - Creates the dataset parts (train and test)
   */
  private async step2() {
    const dataset = shuffle(this.neuralService.createDataset(this.fileList, this.config, this.includeBorderOnDataset, this.config.outputList));
    const trainDatasetSize = Math.floor(typeof this.config.validationPercent === "number" ? (1 - this.config.validationPercent / 100) * dataset.length : dataset.length);

    // @ts-ignore
    window.dataset = dataset;

    this.addStep("Generated dataset");

    let trainDataset = dataset.slice(0, trainDatasetSize);
    if (this.config.distributedFeatures !== "no-redistribution") {
      trainDataset = this.redistributeTrainDataset(trainDataset);
    }
    this.dataset = {
      train: trainDataset,
      test: dataset.slice(trainDatasetSize)
    };
    await sleep(16);
    if (this.haltTraining) {
      throw new Error("Training halted by user");
    }
  }

  /**
   * Step 3 - Create or load the network if necessary
   */
  private async step3() {
    if (!this.network || !this.neuralService.isSameNetwork(this.network, this.fileList, this.config)) {
      this.network = this.neuralService.createNetwork(this.fileList, this.config);
      this.addStep("Created network. Starting training");
    } else {
      this.addStep("Loaded previous network. Starting training");
    }
    await sleep(16);
    if (this.haltTraining) {
      throw new Error("Training halted by user");
    }
  }

  /**
   * Step 4 - Training step that uses the dataset and the network
   */
  private async step4() {
    const numberOfSteps = Math.min(20, this.config.epochCount);
    const datasetStride = (this.dataset.train.length / numberOfSteps) + 1 | 0;
    const trainingStride = Math.max(1, Math.round(this.config.epochCount / numberOfSteps));

    console.log({
      numberOfSteps,
      datasetStride,
      trainingStride,
      test: this.dataset.test.length
    });

    {
      const { accuracy } = this.neuralService.testNetwork(this.network, this.dataset.test.length > 0 ? this.dataset.test : this.dataset.train);
      this.addProgress(0, accuracy);
    }

    let stepCount = 0;
    for (let i = 0; i < this.dataset.train.length; i += datasetStride) {
      stepCount++;
      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }
      const slice = this.dataset.train.slice(i, i + datasetStride);
      if (slice.length === 0) {
        console.warn(`The dataset slice was unexpectedly empty between ${i} and ${datasetStride}, which should not happen.`);
        break;
      }

      this.neuralService.trainNetwork(this.network, slice, trainingStride);

      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }

      {
        const { accuracy } = this.neuralService.testNetwork(this.network, this.dataset.test.length > 0 ? this.dataset.test : this.dataset.train);

        const percent = (i + datasetStride) / (this.dataset.train.length);

        if (percent >= 1) {
          this.addProgress(1, accuracy);
          this.addStep(`Final accuracy: ${(100 * accuracy).toFixed(2)}% ${this.dataset.test.length > 0 ? " (for training data)" : ""}`);
          const seconds = this.getTrainingSecondsFromProgressStep();
          const timeString = seconds < 60 ? `${seconds.toFixed(0)} seconds` : (seconds < 3600 ? `${(seconds/60).toFixed(1)} minutes` : `${(seconds/3600).toFixed(1)} hours`);
          this.addStep(`Trained for ${timeString} in ${stepCount} steps of ${trainingStride} values each.`);
        } else {
          this.addProgress(percent, accuracy);
        }
      }

      await sleep(16);
      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }
    }
  }

  private async step5() {
    let dataset: { input: number[]; output: number[]; }[];
    if (this.dataset.test.length === 0) {
      this.addStep("Testing network with training data:");
      dataset = this.dataset.train;
    } else {
      this.addStep("Testing network with test data:");
      dataset = this.dataset.test;
    }
    const result = this.neuralService.avaliateGuesses(this.network, dataset);
    await sleep(16);
    if (this.haltTraining) {
      throw new Error("Training halted by user");
    }
    const performance = result.accumulated.correct / (result.accumulated.correct + result.accumulated.incorrect);
    this.addStep(`Correct: ${result.accumulated.correct}, Incorrect: ${result.accumulated.incorrect}, Performance: ${(performance * 100).toFixed(1)}%`);
    await sleep(16);
    this.addStep("Finished");
  }

  async onStartTrainingClick() {
    if (this.training) {
      return;
    }
    this.error = null;
    this.haltTraining = false;
    this.training = true;
    const trainingStart = new Date();
    try {
      await this.step1();
      await this.step2();
      await this.step3();
      await this.step4();
      this.hasTrained = true;
      await this.step5();
      // @ts-ignore
      window.network = this.network;
      // @ts-ignore
      window.dataset = this.dataset;
    } catch (err) {
      console.error(err);
      this.error = err;
    }
    const seconds = (new Date().getTime() - trainingStart.getTime()) / 1000;
    const entry = Object.assign({}, this.config, {trainingSeconds: seconds});
    window.localStorage.setItem("training-entries", ((window.localStorage.getItem("training-entries") || "") + "," + JSON.stringify(entry)));
    this.training = false;
  }

  onTrainOnImageClick(fileInput: HTMLInputElement) {
    console.log(fileInput);
    if (!fileInput || !fileInput.hasAttribute || !fileInput.hasAttribute("type") || fileInput.getAttribute("type") !== "file") {
      console.warn("Could not find file input");
      return;
    }
    fileInput.click();
  }

  onResetNetworkClick() {
    if (this.training) {
      return;
    }
    this.hasTrained = false;
    this.network = null;
    this.steps = [];
  }

  onStopTrainingClick() {
    this.haltTraining = true;
    this.addStep("Started training halt (might take a minute)");
  }

  onExportNetworkClick() {
    this.modalService.open("exportModal");
  }

}
