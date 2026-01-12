export interface CalculationResults {
  totalGasCost: number;
  netEarnings: number;
  earningsPerMile: number;
}

export interface TripData {
  payment: string;
  distance: string;
  gasPrice: string;
  mpg: string;
}

export interface TripRecord {
  id: string;
  timestamp: string;
  inputs: TripData;
  results: CalculationResults;
}

// Grounding/AI response link used by the app when showing maps or sources
export interface GroundingLink {
  title: string;
  uri: string;
}

// Augment the global Window to expose optional aistudio helper without using `any` casts
declare global {
  interface Window {
    aistudio?: {
      openSelectKey?: () => Promise<void> | void;
    };
  }
}

export {};
