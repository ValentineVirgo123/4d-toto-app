export type ResultSource = 'live' | 'cache' | 'mock';

export interface FourDResult {
  id?:          string;
  drawDate:     string;
  drawNumber?:  string;
  first:        string;
  second:       string;
  third:        string;
  starters:     string[];
  consolation:  string[];
  source?:      ResultSource;
}

export interface TOTOPrizeGroup {
  group:         string;
  shareAmount?:  string;
  winningShares?: number | string;
}

export interface TOTOResult {
  id?:          string;
  drawDate:     string;
  drawNumber?:  string;
  winningNums:  number[];
  addlNum?:     number;
  jackpot?:     string;
  group1Prize?: string;
  prizeGroups?: TOTOPrizeGroup[];
  source?:      ResultSource;
}
