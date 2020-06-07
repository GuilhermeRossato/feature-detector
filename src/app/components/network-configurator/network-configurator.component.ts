import { Component, OnInit, ViewChild, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-network-configurator',
  templateUrl: './network-configurator.component.html',
  styleUrls: ['./network-configurator.component.css']
})
export class NetworkConfiguratorComponent implements OnInit {

  @Input() selection: {canvas: HTMLCanvasElement, x: number, y: number} = null;

  constructor() { }

  ngOnInit(): void {
  }

}
