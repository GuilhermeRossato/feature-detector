import { Component, OnInit, Input } from '@angular/core';
import { NeuralService } from 'src/app/services/neural.service';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';
import { NetworkConfiguration } from '../network-configurator/network-configurator.component';
import { sleep } from 'src/app/utils/sleep';
import { shuffle } from 'src/app/utils/shuffle';

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
  public steps: {memory?: number, label: string, date: Date}[] = [];
  public network: any;
  public dataset: {
    train: { input: number[]; output: number[]; }[];
    test: { input: number[]; output: number[]; }[]
  } = null;
  public training: boolean;
  private haltTraining: boolean;

  constructor(
    private neuralService: NeuralService
  ) { }

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
      memory: this.getMemoryUsage(),
      date: new Date(),
      label
    });
  }

  getTimeString(index: number, date: Date) {
    if (index === 0 || !this.steps || this.steps[0].date === date) {
      return "at " + date.toLocaleTimeString();
    }
    const seconds = (date.getTime() - this.steps[index-1].date.getTime()) / 1000;
    if (seconds <= 0.1) {
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
    await sleep(17);
    if (this.haltTraining) {
      throw new Error("Training halted by user");
    }
  }

  /**
   * Step 2 - Creates the dataset parts (train and test)
   */
  private async step2() {
    const dataset = shuffle(this.neuralService.createDataset(this.fileList, this.config, this.includeBorderOnDataset));
    const trainDatasetSize = Math.floor(typeof this.config.validationPercent === "number" ? (1 - this.config.validationPercent / 100) * dataset.length : dataset.length);

    this.addStep("Generated dataset");
    let trainDataset = dataset.slice(0, trainDatasetSize);
    if (this.config.distributedFeatures !== "no-redistribution") {
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
      trainDataset = trainDataset.filter((data) => {
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

      // Validation
      {
        const labelRecord: Record<string, number> = {};
        for (let { output } of trainDataset) {
          const key = output.join("");
          if (typeof labelRecord[key] !== "number") {
            labelRecord[key] = 1;
          } else {
            labelRecord[key]++;
          }
        }
        console.log(labelRecord);
      }
    }
    this.dataset = {
      train: trainDataset,
      test: dataset.slice(trainDatasetSize)
    };
    await sleep(17);
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
    await sleep(17);
    if (this.haltTraining) {
      throw new Error("Training halted by user");
    }
  }

  /**
   * Step 4 - Training step that uses the dataset and the network
   */
  private async step4() {
    const numberOfSteps = Math.min(10, this.config.epochCount);
    const datasetStride = (this.dataset.train.length / numberOfSteps) + 1 | 0;
    const trainingStride = Math.max(1, Math.round(this.config.epochCount / numberOfSteps));

    console.log({
      numberOfSteps,
      datasetStride,
      trainingStride,
      test: this.dataset.test.length
    });

    for (let i = 0; i < this.dataset.train.length; i += datasetStride) {
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

      const { accuracy } = this.neuralService.testNetwork(this.network, this.dataset.test.length > 0 ? this.dataset.test : this.dataset.train);
      const percentString = `${(100 * accuracy).toFixed(1)}%`;
      if (i + datasetStride >= this.dataset.train.length) {
        this.addStep(`100% - Accuracy: ${percentString}${this.dataset.test.length > 0 ? " (for training data)" : ""}`);
      } else {
        this.addStep(`${(100 * i / this.dataset.train.length).toFixed(0).padStart(3, '0')}% - Accuracy: ${percentString}`);
      }

      await sleep(17);
      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }
    }
  }

  private async step5() {
    const dataset = this.dataset.test.length === 0 ? this.dataset.train : this.dataset.test;
    const result = this.neuralService.deepTest(this.network, dataset);
    await sleep(17);
    if (this.haltTraining) {
      throw new Error("Training halted by user");
    }
    this.addStep("Tested network");
    console.log(result);
  }

  async onStartTrainingClick() {
    if (this.training) {
      return;
    }
    this.error = null;
    this.haltTraining = false;
    this.training = true;
    try {
      await this.step1();
      await this.step2();
      await this.step3();
      await this.step4();
      await this.step5();
      // @ts-ignore
      window.network = this.network;
      // @ts-ignore
      window.dataset = this.dataset;
    } catch (err) {
      console.error(err);
      this.error = err;
    }
    this.training = false;
  }

  onResetNetworkClick() {
    if (this.training) {
      return;
    }
    this.network = null;
    this.steps = [];
  }

  onStopTrainingClick() {
    this.haltTraining = true;
    this.addStep("Started training halt (might take a minute)");
  }

}
