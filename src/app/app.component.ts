import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from './services/localstorage.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {

  public showDropImageOverlay = true;

  constructor(
    private localStorage: LocalStorageService
  ) {}

  ngOnInit() {
    this.loadStateFromStorage();
  }

  loadStateFromStorage() {
    this.localStorage.getItem("feature-detector-state");
  }

}
