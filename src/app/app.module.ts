import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { FileDropperComponent } from './components/file-dropper/file-dropper.component';
import { ImageListViewComponent } from './components/image-list-view/image-list-view.component';
import { NetworkConfiguratorComponent } from './components/network-configurator/network-configurator.component';
import { NetworkReviewComponent } from './components/network-review/network-review.component';
import { NetworkActionsComponent } from './components/network-actions/network-actions.component';
import { BrushVisualizationComponent } from './components/brush-visualization/brush-visualization.component';
import { DynamicInputComponent } from './components/dynamic-input/dynamic-input.component';

@NgModule({
  declarations: [
    AppComponent,
    FileDropperComponent,
    ImageListViewComponent,
    NetworkConfiguratorComponent,
    NetworkReviewComponent,
    NetworkActionsComponent,
    BrushVisualizationComponent,
    DynamicInputComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
