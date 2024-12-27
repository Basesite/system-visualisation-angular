import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { DatePipe } from '@angular/common';

import { SystemVisualisation } from '../../features/network/models/system-visualisation';
import { VisualizationSettings } from '../../features/network/models/types';

@Component({
  selector: 'app-system-visualisation',
  templateUrl: './system-visualisation.component.html',
  standalone: true,
  imports: [DatePipe],
  styleUrls: ['./system-visualisation.component.scss']
})
export class SystemVisualisationComponent implements OnInit {
  @Input() settings?: VisualizationSettings;
  
  @ViewChild('diagramContainer') diagramContainer!: ElementRef;
  @ViewChild('gridContainer') gridContainer!: ElementRef;

  private systemVis?: SystemVisualisation;
  currentDate: Date = new Date();

  

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    // this.render();
  }

  ngAfterViewInit() {
    // Initialize after the view is ready and we have the container references
    this.systemVis = new SystemVisualisation(
      this.diagramContainer.nativeElement.id,
      this.gridContainer.nativeElement.id
    );

    this.render();
  }

  private render() {
    if (this.systemVis) {
      this.systemVis.render(this.settings);
    }
  }

  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newDate = new Date(input.value);
    this.currentDate = newDate;
    
    if (this.systemVis) {
      this.systemVis.updateSystemDate(newDate);
    }
  }
}