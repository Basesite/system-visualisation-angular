import { Network } from './network';
import { Diagram } from './diagram';
import { NetworkGrid } from './grid';
import { VisualizationSettings } from './types';
import { Pipe } from './pipe';
import { SystemAPIService } from '../services/system-api.service';

export class SystemVisualisation {
  private network: Network;
  private diagram: Diagram;
  private grid: NetworkGrid;

  
  private systemApiService: SystemAPIService;
  

  constructor(diagramContainerId: string, gridContainerId: string) {
    this.systemApiService = new SystemAPIService();
    
    
    this.network = Network.create();

    const apiData = this.systemApiService.getMockApiData();
    this.network = this.systemApiService.buildNetworkFromApi(apiData);

    this.diagram = new Diagram(diagramContainerId, this.network);
    this.grid = new NetworkGrid(gridContainerId, this.network);

    console.log(this)
    // this.initializeControls();
  }

  

  public updateSystemDate(date: Date): void {
    this.updateNetworkStatus(date);
    this.diagram.render({ currentDate: date });
    this.grid.updateData();
  }

  private updateNetworkStatus(date: Date): void {
    const updatePipeStatus = (pipe: Pipe): void => {
      pipe.updateStatus(date);
      pipe.children.forEach((child: Pipe) => updatePipeStatus(child));
    };

    this.network.submains.forEach(submain => updatePipeStatus(submain));
  }

  public render(settings: VisualizationSettings = {}): void {
    this.network.updateLoads()
    this.diagram.render(settings);
    
    this.grid.updateData();
  }
}