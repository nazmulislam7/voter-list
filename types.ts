
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VoterData {
  id: string;
  imageBlob: string;
  pageNumber: number;
}

export type LayoutType = 'single' | 'grid4';

export interface AppState {
  voterPdf: File | null;
  letterFile: File | null;
  voterCrops: VoterData[];
  mappingRect: Rect | null;
  isGenerating: boolean;
  layout: LayoutType;
}
