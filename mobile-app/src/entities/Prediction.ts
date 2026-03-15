export type ModelId = 'frequency' | 'gap' | 'markov';

export interface Prediction {
  model:           string;
  modelId:         ModelId;
  predicted4D:     string;
  predictedTOTO:   number[];
  why:             string;
  assumptions:     string;
  methodology:     string;
  evaluation:      string;
  confidence:      string;
  disclaimer:      string;
  confidenceScore: number;
}

export interface PredictMeta {
  dataPoints:  { fourd: number; toto: number };
  generatedAt: string;
}
