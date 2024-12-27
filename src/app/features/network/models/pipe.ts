import { PipeStatus, PipeType } from './types';
import { Segment } from './segment';


const INSTALL_DATE = new Date("2024-01-01");
const DEINSTALL_DATE = new Date("2026-01-01");

export class Pipe {
  id: string;
  type: PipeType;
  direction: 'x' | 'y' | null;
  upstreamPipe: Pipe | null;
  children: Pipe[];
  path: Pipe[];
  segments: Segment[];
  capacity: number | null;
  installDate: Date;
  deinstallDate: Date;
  status: PipeStatus;
  load?: number;

  private static readonly SUBMAIN_CAPACITY = 300;
  private static readonly LATERAL_CAPACITY = 50;
  private static readonly TOOL_CAPACITY = 10;

  constructor(id: string, type: PipeType, direction: 'x' | 'y' | null = null) {
    this.id = id;
    this.type = type;
    this.direction = direction;
    this.upstreamPipe = null;
    this.children = [];
    this.path = [];
    this.segments = [];
    // Add capacity based on pipe type
    switch (type) {
      case PipeType.SUBMAIN:
        this.capacity = Pipe.SUBMAIN_CAPACITY;
        break;
      case PipeType.LATERAL:
        this.capacity = Pipe.LATERAL_CAPACITY;
        break;
      case PipeType.TOOL:
        this.capacity = Pipe.TOOL_CAPACITY;
        break;
      default:
        this.capacity = null;
    }

    // Initialize lifecycle properties
    this.installDate = INSTALL_DATE; //new Date();
    this.deinstallDate = DEINSTALL_DATE; //new Date();
    this.status = PipeStatus.PLANNED;
  }

  addChild(pipe: Pipe): void {
    this.children.push(pipe);
    pipe.upstreamPipe = this;
    pipe.path = [...this.path, this];

    if (!pipe.direction) {
      pipe.direction = this.direction === 'x' ? 'y' : 'x';
    }
  }

  addSegment(segment: Segment): void {
    this.segments.push(segment);
  }

  isActiveAt(date: Date): boolean {
    if (!this.installDate || !this.deinstallDate) return false;
    return date >= this.installDate && date <= this.deinstallDate;
  }

  updateStatus(currentDate: Date): void {
    if (!this.installDate || !this.deinstallDate) {
      this.status = PipeStatus.PLANNED;
    } else if (currentDate >= this.installDate && currentDate <= this.deinstallDate) {
      this.status = PipeStatus.INSTALLED;
    } else if (currentDate < this.installDate) {
      this.status = PipeStatus.PLANNED;
    } else {
      this.status = PipeStatus.DECOMMISSIONED;
    }
  }
}
