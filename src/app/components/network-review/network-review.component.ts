import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-network-review',
  templateUrl: './network-review.component.html',
  styleUrls: ['./network-review.component.css']
})
export class NetworkReviewComponent implements OnInit {

  @Input() config: {
    brushSize: number,
    brushSpacing: number,
    brushShape: string,
    inputFormat: string,
    hiddenLayerCount: number,
    hiddenNeuronCount: number,
    activationFunction: string,
    epochCount: number
  };

  constructor() { }

  ngOnInit(): void {
  }

}
