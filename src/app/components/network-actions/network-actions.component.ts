import { Component, OnInit, Input } from '@angular/core';
import { NeuralService } from 'src/app/services/neural.service';
import { RawFileDescriptor } from '../file-dropper/file-dropper.component';
import { NetworkConfiguration } from '../network-configurator/network-configurator.component';
import { sleep } from 'src/app/utils/sleep';

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
  public dataset: { input: number[]; output: number[]; }[];
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
    } else if (typeof window.performance.usedJSHeapSize !== "number") {
      return null;
      // @ts-ignore
    } else if (typeof window.performance.jsHeapSizeLimit !== "number") {
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

  async onStartTrainingClick() {
    if (this.training) {
      return;
    }
    this.haltTraining = false;
    this.training = true;
    try {
      this.steps = [];
      this.addStep(this.network ? "Restarted training" : "Started training");
      await sleep(17);
      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }
      this.dataset = this.neuralService.createDataset(this.fileList, this.config, this.includeBorderOnDataset);
      this.addStep("Generated dataset");
      await sleep(17);
      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }
      if (!this.network || !this.neuralService.isSameNetwork(this.network, this.fileList, this.config)) {
        this.network = this.neuralService.createNetwork(this.fileList, this.config);
        this.addStep("Created network");
      } else {
        this.addStep("Loaded previous network");
      }
      await sleep(17);
      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }
      const numberOfSteps = this.config.epochCount + 1;
      for (let i = 0; i <= numberOfSteps; i++) {
        this.neuralService.trainNetwork(this.network, this.dataset, (this.config.epochCount / (numberOfSteps+1)) | 0);
        if (this.haltTraining) {
          throw new Error("Training halted by user");
        }
        const result = this.neuralService.testNetwork(this.network, this.dataset);
        const perf = result.accuracy;
        if (i === numberOfSteps) {
          this.addStep(`Trained (100%) - Accuracy: ${(100 * perf).toFixed(1)}%`);
        } else {
          this.addStep(`Training (${(100 * i / (numberOfSteps)).toFixed(0).padStart(3, '0')}%) - Accuracy: ${(100 * perf).toFixed(1)}%`);
        }
        await sleep(17);
        if (this.haltTraining) {
          throw new Error("Training halted by user");
        }
      }
      const result = this.neuralService.testNetwork(this.network, this.dataset);
      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }
      this.addStep("Tested network");
      await sleep(17);
      if (this.haltTraining) {
        throw new Error("Training halted by user");
      }
      // @ts-ignore
      window.network = this.network;
      console.log(result);
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
