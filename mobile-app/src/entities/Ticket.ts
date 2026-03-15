export type GameType    = '4D' | 'TOTO';
export type DrawType    = 'past' | 'future' | 'unknown';
export type ResultStatus = 'pending' | 'won' | 'not_won' | 'not_applicable';
export type BetType     = 'ordinary' | 'iBet' | 'system' | 'quickPick' | 'iTOTO' | string;

export interface TicketNotification {
  title: string;
  body:  string;
  won:   boolean;
  read:  boolean;
}

export interface Ticket {
  id:                       string;
  gameType:                 GameType;
  drawDate?:                string;
  drawDates?:               string[];
  numbers?:                 string[];
  betType?:                 BetType;
  combinationCount?:        number;
  systemSize?:              number;
  expandedCombinations?:    number[][];
  expandedCombinationCount?: number;
  amount?:                  number;
  serialNumber?:            string;
  imageUrl?:                string;
  drawType?:                DrawType;
  resultStatus?:            ResultStatus;
  prizeTier?:               string;
  winMatches?:              Array<{ number?: string; combination?: number[]; prize: string }>;
  notification?:            TicketNotification;
  ticketPurchaseDate?:      string;
  uploadedAt?:              string;
  createdAt?:               string;
}

export interface ComparisonResult {
  won:                boolean;
  prizeTier?:         string;
  matches?:           Array<{ number?: string; combination?: number[]; prize: string }>;
  prizeBreakdown?:    Record<string, number>;
  totalWinningCombos?: number;
  totalCombosChecked?: number;
  isSystemBet?:       boolean;
  systemSize?:        number;
  status?:            string;
}

export interface OcrResult extends Partial<Ticket> {
  ticketId?:                string;
  filename?:                string;
  rawText?:                 string;
  drawType?:                DrawType;
  expandedCombinationCount?: number;
  comparison?:              ComparisonResult;
  officialResult?:          Record<string, any>;
  isSystemBet?:             boolean;
}
