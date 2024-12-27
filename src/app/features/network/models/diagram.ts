import { Network } from './network';
import { Pipe } from './pipe';
import { PipeStatus, PipeType, VisualizationSettings, Point } from './types';
import { Segment } from './segment';

import { PipeLengthConfig, SubmainVerticalSpacing } from '../config/layoutConfig';


export class Diagram {
  private svg: SVGElement;
  private network: Network;
  private container: HTMLElement;
  
  private readonly colors = {
    [PipeType.SUBMAIN]: '#00b8d4',
    [PipeType.LATERAL]: 'orange',
    [PipeType.TOOL]: 'magenta'
  };

  private readonly lineWidths = {
    [PipeType.SUBMAIN]: 8,
    [PipeType.LATERAL]: 4,
    [PipeType.TOOL]: 1.5
  };

  constructor(containerId: string, network: Network) {
    this.container = document.getElementById(containerId)!;
    this.network = network;
    this.svg = this.createSVG();
    this.initializeSVGDefs();
  }

  private createSVG(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "2000");
    svg.setAttribute("height", "1200");
    svg.setAttribute("viewBox", "0 0 2000 1200");
    return svg;
  }

  private initializeSVGDefs(): void {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <symbol id="status-installed" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="green" stroke-width="2"/>
        <path d="M6 12l4 4 8-8" fill="none" stroke="green" stroke-width="2"/>
      </symbol>
      
      <symbol id="status-planned" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="orange" stroke-width="2"/>
        <path d="M12 7v5l3 3" fill="none" stroke="orange" stroke-width="2"/>
      </symbol>
      
      <symbol id="status-decommissioned" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="red" stroke-width="2"/>
        <path d="M8 8l8 8m-8 0l8-8" fill="none" stroke="red" stroke-width="2"/>
      </symbol>
    `;
    this.svg.appendChild(defs);
  }

  private drawPipe(pipe: Pipe, startX: number, startY: number): void {
    const length = this.getPipeLength(pipe.type);
    const endX = pipe.direction === 'x' ? startX + length : startX;
    const endY = pipe.direction === 'y' ? startY + length : startY;

    pipe.updateStatus(new Date());


    // Draw pipe line
    const pipeElement = this.createPipeLine(startX, startY, endX, endY, pipe);
    this.svg.appendChild(pipeElement);

    // Add labels and status icons
    this.addPipeLabels(pipe, startX, startY, endX, endY);

    // Recursively draw children
    if (pipe.children.length > 0) {
      const spacing = length / (pipe.children.length + 1);
      pipe.children.forEach((child, index) => {
        const childStartX = pipe.direction === 'x' ? startX + spacing * (index + 1) : startX;
        const childStartY = pipe.direction === 'y' ? startY + spacing * (index + 1) : startY;
        this.drawPipe(child, childStartX, childStartY);
      });
    }
  }

  private getPipeLength(type: PipeType): number {
    return PipeLengthConfig[type];
  }

  private createPipeLine(startX: number, startY: number, endX: number, endY: number, pipe: Pipe): SVGLineElement {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", startX.toString());
    line.setAttribute("y1", startY.toString());
    line.setAttribute("x2", endX.toString());
    line.setAttribute("y2", endY.toString());
    line.setAttribute("stroke", this.colors[pipe.type]);
    line.setAttribute("stroke-width", this.lineWidths[pipe.type].toString());
    
    if (pipe.status === PipeStatus.DECOMMISSIONED) {
      line.setAttribute("stroke-dasharray", "1 1");
      line.setAttribute("stroke", "#999");
    }
    
    return line;
  }

  private addPipeLabels(pipe: Pipe, startX: number, startY: number, endX: number, endY: number): void {
    this.addPipeIdLabel(pipe, endX, endY);
    if (pipe.type === PipeType.TOOL) {
      this.addLoadLabel(pipe, startX, startY, endX, endY);
    }
  }
  
  private addPipeIdLabel(pipe: Pipe, x: number, y: number): void {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", (x + 5).toString());
    label.setAttribute("y", y.toString());
    label.setAttribute("fill", pipe.status === PipeStatus.DECOMMISSIONED ? "#999" : "black");
    label.setAttribute("font-family", "monospace");
    label.setAttribute("font-size", "12");
    label.setAttribute("text-anchor", "start");
    label.textContent = `${pipe.id} ${pipe.status}`;
    this.svg.appendChild(label);
  }
  
  private addLoadLabel(pipe: Pipe, startX: number, startY: number, endX: number, endY: number): void {
    if (!pipe.load) return;
    
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const isVertical = startX === endX;
  
    const loadLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    loadLabel.setAttribute("x", midX.toString());
    loadLabel.setAttribute("y", (midY - 5).toString());
    loadLabel.setAttribute("fill", pipe.status === PipeStatus.DECOMMISSIONED ? "#999" : "grey");
    loadLabel.setAttribute("font-family", "monospace");
    loadLabel.setAttribute("font-size", "10");
    loadLabel.setAttribute("text-anchor", "middle");
    
    if (isVertical) {
      loadLabel.setAttribute("transform", `rotate(-90 ${midX} ${midY})`);
    }
    
    loadLabel.textContent = pipe.load.toFixed(2);
    this.svg.appendChild(loadLabel);
  
    // Add status icon next to pipe label
    const iconSize = 18;
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "use");
    icon.setAttribute("x", (midX + (isVertical ? -12 : 8)).toString());
    icon.setAttribute("y", (midY - 8).toString());
    icon.setAttribute("width", iconSize.toString());
    icon.setAttribute("height", iconSize.toString());
    icon.setAttribute("href", `#status-${pipe.status.toLowerCase()}`);
    this.svg.appendChild(icon);
  }

  private renderSegments(segments: Segment[], settings: VisualizationSettings = {}): void {
    const {
      useLoadWidth = true,
      colorMode = "loadScale",
      currentDate = new Date(),
    } = settings;
  
    const maxLoad = Math.max(...segments.map(s => s.load));
  
    segments.forEach(segment => {
      const pipe = segment.parentPipe;
      if (!pipe) return;
      // console.log({segment})
      pipe.updateStatus(currentDate);
      if (pipe.status === PipeStatus.DECOMMISSIONED) {
        console.log('decommissioned', {segment})
        return;
      }
  
      this.drawSegmentLine(segment, maxLoad, useLoadWidth, colorMode);
      this.drawSegmentStartPoint(segment);
      
      if (segment.downstreamSegments.length > 0) {
        this.addSegmentLoadLabel(segment);
        if (pipe.capacity) {
          this.addCapacityWarning(segment);
        }
      }
    });
  }
  
  private drawSegmentLine(segment: Segment, maxLoad: number, useLoadWidth: boolean, colorMode: string): void {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", segment.startPoint.x.toString());
    line.setAttribute("y1", segment.startPoint.y.toString());
    line.setAttribute("x2", segment.endPoint.x.toString());
    line.setAttribute("y2", segment.endPoint.y.toString());
  
    const width = this.calculateSegmentWidth(segment, maxLoad, useLoadWidth);
    const color = this.getSegmentColor(segment, colorMode);
  
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", width.toString());
    this.svg.appendChild(line);
  }
  
  private calculateSegmentWidth(segment: Segment, maxLoad: number, useLoadWidth: boolean): number {
    if (useLoadWidth) {
      const minWidth = 5;
      const maxWidth = 20;
      return minWidth + (maxWidth - minWidth) * (segment.load / maxLoad);
    }
    return this.lineWidths[segment.parentPipe?.type || PipeType.TOOL];
  }
  
  private getSegmentColor(segment: Segment, colorMode: string): string {
    if (colorMode === "loadScale") {
      return this.getColorForLoad(segment.load, segment.parentPipe?.capacity || 0);
    }
    
    const capacity = segment.parentPipe?.capacity;
    if (capacity && segment.load > capacity) {
      return "rgba(255, 0, 0, 0.7)";
    }
    return this.colors[segment.parentPipe?.type || PipeType.TOOL];
  }
  
  private drawSegmentStartPoint(segment: Segment): void {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", segment.startPoint.x.toString());
    circle.setAttribute("cy", segment.startPoint.y.toString());
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", "blue");
    this.svg.appendChild(circle);
  }
  
  private addSegmentLoadLabel(segment: Segment): void {
    const midX = (segment.startPoint.x + segment.endPoint.x) / 2;
    const midY = (segment.startPoint.y + segment.endPoint.y) / 2;
    const isVertical = segment.startPoint.x === segment.endPoint.x;
  
    const loadLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    loadLabel.setAttribute("x", midX.toString());
    loadLabel.setAttribute("y", (midY - 10).toString());
    loadLabel.setAttribute("fill", "grey");
    loadLabel.setAttribute("font-family", "monospace");
    loadLabel.setAttribute("font-size", "10");
    loadLabel.setAttribute("text-anchor", "middle");
  
    if (isVertical) {
      loadLabel.setAttribute("transform", `rotate(-90 ${midX} ${midY})`);
    }
  
    loadLabel.textContent = segment.load.toFixed(2);
    this.svg.appendChild(loadLabel);
  
    if (segment.parentPipe?.status === PipeStatus.DECOMMISSIONED) {
      this.addStrikethrough(loadLabel, midX, midY, isVertical);
    }
  }

  private addStrikethrough(label: SVGTextElement, midX: number, midY: number, isVertical: boolean): void {
    const textWidth = label.getComputedTextLength() || 20;
    const strikethrough = document.createElementNS("http://www.w3.org/2000/svg", "line");
    
    if (isVertical) {
      strikethrough.setAttribute("x1", (midX - 2).toString());
      strikethrough.setAttribute("y1", (midY + textWidth/2).toString());
      strikethrough.setAttribute("x2", (midX - 2).toString());
      strikethrough.setAttribute("y2", (midY - textWidth/2).toString());
      strikethrough.setAttribute("transform", `rotate(-90 ${midX} ${midY})`);
    } else {
      strikethrough.setAttribute("x1", (midX - textWidth/2).toString());
      strikethrough.setAttribute("y1", (midY - 5).toString());
      strikethrough.setAttribute("x2", (midX + textWidth/2).toString());
      strikethrough.setAttribute("y2", (midY - 5).toString());
    }
    
    strikethrough.setAttribute("stroke", "#999");
    strikethrough.setAttribute("stroke-width", "0.5");
    this.svg.appendChild(strikethrough);
  }
  
  private addCapacityWarning(segment: Segment): void {
    if (!segment.parentPipe?.capacity) return;
    
    const midX = (segment.startPoint.x + segment.endPoint.x) / 2;
    const midY = (segment.startPoint.y + segment.endPoint.y) / 2;
    const isVertical = segment.startPoint.x === segment.endPoint.x;
    const labelOffset = 25;
  
    if (segment.load > segment.parentPipe.capacity) {
      const warningLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      warningLabel.setAttribute("x", midX.toString());
      warningLabel.setAttribute("y", (midY - labelOffset).toString());
      warningLabel.setAttribute("fill", "red");
      warningLabel.setAttribute("font-family", "monospace");
      warningLabel.setAttribute("font-size", "12");
      warningLabel.setAttribute("font-weight", "bold");
      warningLabel.setAttribute("text-anchor", "middle");
  
      if (isVertical) {
        warningLabel.setAttribute("transform", `rotate(-90 ${midX} ${midY})`);
      }
  
      const loadPercentage = ((segment.load / segment.parentPipe.capacity) * 100).toFixed(0);
      warningLabel.textContent = `${loadPercentage}%`;
      this.svg.appendChild(warningLabel);
    }
  }

  private getColorForLoad(load: number, capacity: number): string {
    if (!capacity) return this.colors[PipeType.TOOL];

    if (load === 0) return "grey";
    
    const loadRatio = load / capacity;
    
    // Color gradient from green to yellow to red
    if (loadRatio <= 0.5) {
      // Green to Yellow (0% - 50%)
      const ratio = loadRatio * 2; // Scale to 0-1
      return `rgba(${Math.floor(255 * ratio)}, 255, 0, 0.5)`;
    } else {
      // Yellow to Red (50% - 100%+)
      const ratio = (loadRatio - 0.5) * 2; // Scale to 0-1
      return `rgba(255, ${Math.floor(255 * (1 - ratio))}, 0, 0.5)`;
    }
  }

  // ... Additional helper methods ...

  public render(settings: VisualizationSettings = {}): void {
    // Clear existing content
    this.svg.innerHTML = '';
    this.initializeSVGDefs();

    const submainSpacing = this.getPipeLength(PipeType.LATERAL) + 100
    // Draw network
    this.network.submains.forEach((submain, index) => {
      this.drawPipe(submain, 50, 100 + index * SubmainVerticalSpacing);
    });
    this.renderSegments(this.network.segments);

    // Update container
    this.container.innerHTML = '';
    this.container.appendChild(this.svg);
  }

  // ... More methods for handling interactions and updates ...
}