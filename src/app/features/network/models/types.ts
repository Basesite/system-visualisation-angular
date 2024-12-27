export enum PipeStatus {
    PLANNED = "PLANNED",
    INSTALLED = "INSTALLED",
    DECOMMISSIONED = "REMOVED"
  }
  
  export enum PipeType {
    SUBMAIN = "submain",
    LATERAL = "lateral",
    TOOL = "tool"
  }
  
  export interface Point {
    x: number;
    y: number;
  }
  
  export interface VisualizationSettings {
    useLoadWidth?: boolean;
    colorMode?: 'loadScale' | 'capacityWarning';
    currentDate?: Date;
  }