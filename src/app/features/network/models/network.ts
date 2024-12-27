import { Pipe } from './pipe';
import { PipeType , PipeStatus} from './types';
import { Point } from './types';
import { Segment } from './segment';

import { PipeLengthConfig, SubmainVerticalSpacing } from '../config/layoutConfig';


export class Network {
  submains: Pipe[];
  segments: Segment[];
  constructor() {
    this.submains = [];
    this.segments = [];
  }

  static create(): Network {
    const network = new Network();
    
    // Create submains (horizontal)
    const s01 = new Pipe("S01", PipeType.SUBMAIN, "x");
    const s02 = new Pipe("S02", PipeType.SUBMAIN, "x");
    
    // Create laterals and tools
    [s01, s02].forEach(submain => {
      Array.from({ length: 6 }, (_, i) => {
        const lateral = new Pipe(`L${i + 1}`, PipeType.LATERAL);
        submain.addChild(lateral);

        Array.from({ length: 5 }, (_, j) => {
          const tool = new Pipe(`T${j + 1}`, PipeType.TOOL);
          tool.load = Network.getRandomLoad();
          // const {installDate, deinstallDate} = Network.generateRandomDates();
          // tool.installDate = installDate;
          // tool.deinstallDate = deinstallDate;
          lateral.addChild(tool);
        });
      });
    });

    network.submains = [s01, s02];

    network.submains.forEach((submain) => {
      // First set dates for all tools
      Network.setToolDatesAndPropagate(submain);
  
      // Then update all laterals
      submain.children.forEach((lateral) => {
        Network.updateParentPipeDates(lateral);
      });
  
      // Finally update the submain itself
      Network.updateParentPipeDates(submain);
    });
  

     // Calculate loads for all submains
     network.submains.forEach(submain => {
      network.calculateParentLoads(submain);
    });

    
    network.segments = network.generateSegments();
    network.updateLoads();
    return network;
  }

  static getRandomLoad(): number {
    return Number((Math.random() * 10 + 5).toFixed(2));
  }

  private calculateParentLoads(pipe: Pipe): number {
    if (pipe.children.length === 0) {
      return pipe.load || 0;
    }

    // Sum up children's loads
    pipe.load = pipe.children.reduce((sum, child) => {
      return sum + this.calculateParentLoads(child);
    }, 0);

    return pipe.load;
  }

  updateLoads(): void {
    // const calculatePipeLoad = (pipe: Pipe): number => {
    //   // For pipes with no children (end tools), return their set load
    //   if (pipe.children.length === 0) {
    //     return pipe.load || 0;
    //   }

    //   // For pipes with children, calculate load as sum of children's loads
    //   const totalLoad = pipe.children.reduce((sum, child) => {
    //     return sum + calculatePipeLoad(child);
    //   }, 0);

    //   // Set the pipe's load and return it
    //   pipe.load = Number(totalLoad.toFixed(2));
    //   return pipe.load;
    // };

    // this.submains.forEach(submain => calculatePipeLoad(submain));



    // trying this 


       // Calculate loads for all submains
      //  network.submains.forEach(submain => {
      //   network.calculateParentLoads(submain);
      // });

      this.calculateSegmentLoads(this.segments);
  }

  // Helper function to generate random dates
 static generateRandomDates() {
  const today = new Date();
  const minLifetime = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
  const maxFutureMonths = 24; // Look up to 2 years in the future
  const maxPastMonths = 12; // Look up to 1 year in the past

  // Random install date between 1 year ago and 2 years in the future
  const installDate = new Date(
    today.getTime() +
      (Math.random() * (maxFutureMonths + maxPastMonths) - maxPastMonths) *
        30 *
        24 *
        60 *
        60 *
        1000
  );

  // Random deinstall date at least 1 week after install date
  const deinstallDate = new Date(
    installDate.getTime() +
      minLifetime +
      Math.random() * maxFutureMonths * 30 * 24 * 60 * 60 * 1000
  );
  // console.log(installDate, deinstallDate);
  return { installDate, deinstallDate };
}

// After setting tool dates, update parent pipe dates
 static updateParentPipeDates(pipe: Pipe) {
  if (pipe.children.length > 0) {
    // Parent pipe's install date is the earliest child install date
    const childInstallDates = pipe.children
      .map((child) => child.installDate)
      .filter((date) => date !== null);

    const childDeinstallDates = pipe.children
      .map((child) => child.deinstallDate)
      .filter((date) => date !== null);

   

    if (childInstallDates.length > 0 && childDeinstallDates.length > 0) {
      pipe.installDate = new Date(Math.min(...childInstallDates.map(d => d.getTime())));
      pipe.deinstallDate = new Date(Math.max(...childDeinstallDates.map(d => d.getTime())));

     
    }
  }

  // Update status based on current date
  pipe.updateStatus(new Date());

  // Recursively update parent pipes
  if (pipe.upstreamPipe) {
    Network.updateParentPipeDates(pipe.upstreamPipe);
  }
}

  generateSegments(): Segment[] {
    const segments: Segment[] = [];
    let segmentId = 1;

    const createSegmentsForPipe = (pipe: Pipe, startX: number, startY: number): Segment | null => {
      const pipeLength = this.getPipeLength(pipe.type);

      // Calculate pipe endpoints
      let endX = startX;
      let endY = startY;
      if (pipe.direction === "x") {
        endX += pipeLength;
      } else {
        endY += pipeLength;
      }

      // If pipe has children, create segments between each child connection
      if (pipe.children.length > 0) {
        const spacing = pipeLength / (pipe.children.length + 1);
        let lastPoint = { x: startX, y: startY };
        let firstSegment: Segment | null = null;
        let lastSegment: Segment | null = null;

        // Create segments for each child connection
        pipe.children.forEach((child, index) => {
          // Calculate connection point
          let connectionX = startX;
          let connectionY = startY;
          if (pipe.direction === "x") {
            connectionX += spacing * (index + 1);
          } else {
            connectionY += spacing * (index + 1);
          }

          // Create segment from last point to this connection
          const segment = new Segment(
            pipe,
            lastPoint,
            { x: connectionX, y: connectionY }
          );
          segments.push(segment);

          // Store first segment
          if (!firstSegment) {
            firstSegment = segment;
          }

          if (lastSegment) {
            lastSegment.downstreamSegments.push(segment);
            segment.upstreamSegment = lastSegment;
          }

          // Create child segments
          const childFirstSegment = createSegmentsForPipe(
            child,
            connectionX,
            connectionY
          );

          // Connect this segment to the first segment of the child
          if (childFirstSegment) {
            segment.downstreamSegments.push(childFirstSegment);
            childFirstSegment.upstreamSegment = segment;
          }

          lastPoint = { x: connectionX, y: connectionY };
          lastSegment = segment;
        });

        // Create final segment to end of pipe
        const finalSegment = new Segment(
          pipe,
          lastPoint,
          { x: endX, y: endY }
        );
        segments.push(finalSegment);

        // if (lastSegment) {
        //   lastSegment.downstreamSegments.push(finalSegment);
        //   finalSegment.upstreamSegment = lastSegment;
        // }

        return firstSegment;
      } else {
        // For pipes without children (tools), create a single segment
        const segment = new Segment(
          pipe,
          { x: startX, y: startY },
          { x: endX, y: endY }
        );
        segment.load = pipe.load || 0; // Use the tool's load
        segments.push(segment);
        return segment;
      }
    };

    // Generate segments for each submain
    this.submains.forEach((submain, index) => {
      createSegmentsForPipe(submain, 50, 100 + index * SubmainVerticalSpacing);
    });

    this.calculateSegmentLoads(segments);

    return segments;
  }

  private getPipeLength(type: PipeType): number {
    return PipeLengthConfig[type];
  }

  private calculateSegmentLoads(segments: Segment[]): void {
    // Find end segments (those without downstream segments)
    const endSegments = segments.filter(s => s.downstreamSegments.length === 0);
    

    // Process each end segment and propagate loads upstream
    endSegments.forEach(segment => {
      let currentSegment: Segment | null = segment;
      while (currentSegment) {
        if (currentSegment.downstreamSegments.length > 0) {
          
          currentSegment.updateLoad(new Date());
        }
        currentSegment = currentSegment.upstreamSegment;
      }
    });

   
  }

  static setToolDatesAndPropagate(pipe: Pipe): void {
    if (pipe.type === PipeType.TOOL) {
      const { installDate, deinstallDate } = Network.generateRandomDates();
      pipe.installDate = installDate;
      pipe.deinstallDate = deinstallDate;
    } else {
      pipe.children.forEach(child => Network.setToolDatesAndPropagate(child));
    }
    pipe.updateStatus(new Date());
  }

  private getConnectedDownstreamLoad(pipe: Pipe): number {
    if (pipe.children.length === 0) {
      return pipe.load || 0;
    }

    // Sum up children's loads
    pipe.load = pipe.children.reduce((sum, child) => {
      return sum + this.getConnectedDownstreamLoad(child);
    }, 0);

    return pipe.load;
  }
}