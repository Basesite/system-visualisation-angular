import { Point } from "./types";
import { Pipe } from "./pipe";
import { PipeStatus } from "./types";

export class Segment {
  id?: string;
  startPoint: Point;
  endPoint: Point;
  load: number = 0;
  upstreamSegment: Segment | null = null;
  downstreamSegments: Segment[] = [];
  parentPipe: Pipe | null = null;

  constructor(pipe: Pipe, startPoint: Point, endPoint: Point) {
    //this.id = id;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.upstreamSegment = null;
    this.downstreamSegments = [];
    this.parentPipe = pipe;
    this.parentPipe.addSegment(this);
  }

  addDownstreamSegment(segment: Segment): void {
    this.downstreamSegments.push(segment);
    segment.upstreamSegment = this;
  }

  getLength(): number {
    const dx = this.endPoint.x - this.startPoint.x;
    const dy = this.endPoint.y - this.startPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  updateLoad(date: Date): void {
    this.load = this.downstreamSegments.reduce((sum, ds) => {
      if (ds.parentPipe?.status === PipeStatus.DECOMMISSIONED) {
        return sum;
      }
      return sum + ds.load;
    }, 0);
  }
}
