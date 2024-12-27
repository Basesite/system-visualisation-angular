import { PipeType } from '../models/types';

export const PipeLengthConfig: Record<PipeType, number> = {
  [PipeType.SUBMAIN]: 1500,
  [PipeType.LATERAL]: 300,
  [PipeType.TOOL]: 50
}; 

export const SubmainVerticalSpacing = PipeLengthConfig[PipeType.LATERAL] + 100; // Adding buffer