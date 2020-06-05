import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { FileDropperComponent } from './components/file-dropper/file-dropper.component';
import { ImageListViewComponent } from './components/image-list-view/image-list-view.component';
import { NetworkConfiguratorComponent } from './components/network-configurator/network-configurator.component';

@NgModule({
  declarations: [
    AppComponent,
    FileDropperComponent,
    ImageListViewComponent,
    NetworkConfiguratorComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
