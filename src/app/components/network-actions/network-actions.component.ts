import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-network-actions',
  templateUrl: './network-actions.component.html',
  styleUrls: ['./network-actions.component.css']
})
export class NetworkActionsComponent implements OnInit {

  public includeBorderOnDataset = true;

  constructor() { }

  ngOnInit(): void {
  }

  onIncludeBorderChange({name, value}: {name: string, value: 'true' | 'false'}) {
    this.includeBorderOnDataset = value === 'true';
  }

}
