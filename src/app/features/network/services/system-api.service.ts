import { Pipe } from '../models/pipe';
import { Network } from '../models/network';
import { PipeType } from '../models/types';

import mockPipeData from '../data/mock-pipe-data.json';


interface PipeApiResponse {
    name: string;
    id: string; // unique id of this element
    parentComponentId?: string; // used to identify the parent element
    parentComponentName?: string;
    path: string[];
    projectId: string;
    utilityTypeId: string;
    pipeTypeId: string;
    sizeId: string;
    unitOfMeasure: number;
    diameter: number;
    thickness: number;
    calculationType: number;
    pdf: number;
    puf: number;
    pcf: number;
    auf: number;
    acf: number;
    designMax: number;
    alterFactor: number;
    direction: number;
    installationDate: string;
    updatedById: string;
    loadDate: string;
    avgLoad: number;
    peakLoad: number;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export class SystemAPIService {
    private static determinePipeType(pipe: PipeApiResponse, allPipes: PipeApiResponse[]): PipeType {
        
        // If no other pipes have this as parent, it's a Tool
        const isLeaf = !allPipes.some(p => p.parentComponentId === pipe.id);
        if (isLeaf) return PipeType.TOOL;

        // If it has no parent, it's a Submain
        if (!pipe.parentComponentId) return PipeType.SUBMAIN;

        // Otherwise it's a Lateral
        return PipeType.LATERAL;
    }

   

    public buildNetworkFromApi(apiData: PipeApiResponse[]): Network {
        const network = new Network();
        const pipeMap = new Map<string, Pipe>();

        // First, identify and create submains
        const submains = apiData.filter(p => !p.parentComponentId);
        submains.forEach(submainData => {
            const submain = new Pipe( submainData.name, PipeType.SUBMAIN, "x");
            pipeMap.set(submainData.id, submain);
            network.submains.push(submain);
        });

        // Create and connect laterals
        const laterals = apiData.filter(p => 
            p.parentComponentId && 
            submains.some(s => s.id === p.parentComponentId)
        );

        laterals.forEach(lateralData => {
            const lateral = new Pipe( lateralData.name, PipeType.LATERAL);
            pipeMap.set(lateralData.id, lateral);
            
            const parentSubmain = pipeMap.get(lateralData.parentComponentId!)!;
            parentSubmain.addChild(lateral);
        });

        // Create and connect tools
        const tools = apiData.filter(p => 
            p.parentComponentId && 
            laterals.some(l => l.id === p.parentComponentId)
        );

        tools.forEach(toolData => {
            const tool = new Pipe( toolData.name, PipeType.TOOL);
            tool.load = toolData.avgLoad > 0? toolData.avgLoad : Network.getRandomLoad(); 
            pipeMap.set(toolData.id, tool);
            
            const parentLateral = pipeMap.get(toolData.parentComponentId!)!;
            parentLateral.addChild(tool);
        });


        network.segments = network.generateSegments();

        console.log({network})
        // Update loads throughout the network
        network.updateLoads();

        return network;
    }

    // Simulate API call (for testing)
    public getMockApiData(): PipeApiResponse[] {

        return mockPipeData;

        
    }
} 