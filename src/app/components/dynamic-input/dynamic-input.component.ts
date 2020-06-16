import { Component, OnInit, Output, EventEmitter, Input, AfterViewInit } from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-dynamic-input',
  templateUrl: './dynamic-input.component.html',
  styleUrls: ['./dynamic-input.component.css']
})
export class DynamicInputComponent implements OnInit, AfterViewInit {

  @Input() name: string;
  @Input() startValue: string;
  @Input() type: "text" | "number" | "select" | "checkbox";
  @Input() options?: {value: string, label: string}[];
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number;
  @Input() maxlength?: number;

  @Output() inputChange = new EventEmitter<{name: string, value: string}>();

  public value: string;
  public error?: string;

  constructor(
    private localStorage: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.value = this.startValue.toString() || "";
  }

  getInputFromStorage(): string {
    const key = `vfs-input-${this.name}`;
    const value = this.localStorage.getItem(key);
    if (!value && value !== "0") {
      return null;
    }
    return value;
  }

  setInputToStorage(value: string) {
    const key = `vfs-input-${this.name}`;
    this.localStorage.setItem(key, value);
  }

  ngAfterViewInit() {
    if ((this.value === this.startValue.toString()) || (this.value === "" && this.startValue === undefined)) {
      const cachedValue = this.getInputFromStorage();
      setTimeout(() => {
        if (cachedValue || cachedValue === "0") {
          this.applyChange(cachedValue);
        } else {
          this.value = this.startValue || "";
        }
      }, 10);
    }
  }

  onChange(event: Event, element: HTMLInputElement | HTMLSelectElement) {
    const value = element instanceof HTMLInputElement && this.type === "checkbox" ? element.checked.toString() : element.value;
    this.applyChange(value);
    if (this.error === null) {
      this.setInputToStorage(value);
    }
  }


  private applyChange(value: string) {
    if (this.value === value) {
      return;
    } else if (this.type === "number" && !(/^\d+$/.test(value))) {
      this.error = "Numbers should only contain digits";
      return;
    } else if (this.type === "number" && this.min && parseInt(value, 10) < parseInt(this.min.toString(), 10)) {
      this.error = "Number input with minimum should not have values lower than minimum";
      return;
    } else if (this.type === "number" && this.max && parseInt(value, 10) > parseInt(this.max.toString(), 10)) {
      this.error = "Number input with maximum should not have values heigher than maximum";
      return;
    } else if (this.type === "text" && typeof this.maxlength === "number" && value.length >= this.max) {
      this.error = "Text input with maxlength should not have more characters than allowed";
      return;
    }
    this.error = null;
    this.value = value;
    if (this.name === undefined) {
      throw new Error("Input changed without name");
    }
    if (value === undefined) {
      throw new Error("Value is undefined unexpectedly");
    }
    // console.log("Emiting from " + this.name + " the value \"" + value + "\"");
    this.inputChange.emit({name: this.name, value});
  }
}
