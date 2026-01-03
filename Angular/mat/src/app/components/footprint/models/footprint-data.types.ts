export interface FootprintInitOptions {
  minimode: boolean;
  deltamode: boolean;
}

export type FootprintUpdateType = 'cluster' | 'ticks' | 'ladder';

export interface FootprintUpdateEvent {
  type: FootprintUpdateType;
  merged?: boolean;
}
