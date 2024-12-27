import { Network } from './network';
import { Pipe } from './pipe';
import { createGrid, GridOptions, GridApi } from 'ag-grid-enterprise';

import { ModuleRegistry, provideGlobalGridOptions } from 'ag-grid-community';
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise';

LicenseManager.setLicenseKey('your License Key');

// Register all enterprise features
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Mark all grids as using legacy themes
//provideGlobalGridOptions({ theme: "legacy"});

export class NetworkGrid {
  
  private network: Network;
  private gridOptions: GridOptions<any>;
  private gridApi: GridApi<any> | undefined;


  constructor(containerId: string, network: Network) {
    this.network = network;
    this.gridOptions = this.createGridOptions();
    this.initializeGrid(containerId);
  }

  private createGridOptions(): GridOptions {
    return {
      columnDefs: [
        {
          field: "id",
          headerName: "Pipe ID",
          cellRenderer: "agGroupCellRenderer",
          showRowGroup: false,
          minWidth: 250,
        },
        {
          field: "type",
          headerName: "Type",
          minWidth: 120,
        },
        {
          field: "direction",
          headerName: "Direction",
          minWidth: 20,
          flex: 0.4,
        },
        {
          field: "load",
          headerName: "Load",
          minWidth: 100,
          valueFormatter: (params) => params.value ? params.value.toFixed(2) : "",
          type: "numericColumn",
          flex: 0.5,
        },
        // ... more column definitions ...
      ],
           
      defaultColDef: {
        flex: 1,
        sortable: true,
        filter: true,
        resizable: true,
      },
      treeData: true,
      getDataPath: (data) => data.path,
      groupDefaultExpanded: -1,
      animateRows: true,
      onGridReady: (params) => {
        this.gridApi = params.api;  // Store the API when grid is ready
      }
    };
  }

  private createGridData(): any[] {
    const flattenPipeData = (pipe: Pipe, parentPath: string[] = []): any[] => {
      const currentPath = [...parentPath, pipe.id];
      
      const row = {
        id: pipe.id,
        type: pipe.type,
        direction: pipe.direction,
        load: pipe.load ? Number(pipe.load.toFixed(2)) : null,
        installDate: pipe.installDate,
        deinstallDate: pipe.deinstallDate,
        status: pipe.status,
        path: currentPath,
      };

      let rows = [row];
      if (pipe.children && pipe.children.length > 0) {
        pipe.children.forEach(child => {
          rows = rows.concat(flattenPipeData(child, currentPath));
        });
      }

      return rows;
    };

    return this.network.submains.flatMap(pipe => flattenPipeData(pipe));
  }

  private initializeGrid(containerId: string): void {
    const gridDiv = document.getElementById(containerId);
    if (gridDiv) {
      this.gridApi = createGrid(gridDiv, this.gridOptions);
    
    }
  }

  public updateData(): void {
    const newData = this.createGridData();
    this.gridApi?.setGridOption('rowData', newData);
  }
}