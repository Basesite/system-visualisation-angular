import { Component } from '@angular/core';
import { SystemVisualisationComponent } from './components/system-visualisation/system-visualisation.component';
@Component({
  selector: 'app-root',
  template: '<app-system-visualisation></app-system-visualisation>',
  standalone: true,
  imports: [SystemVisualisationComponent]  // Add this import
})
export class AppComponent {} 