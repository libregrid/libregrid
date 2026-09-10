export interface SaleRow {
  order: string;
  product: string;
  amountUsd: number;
  region: string;
  category: string;
  salesRep: string;
  closedDate: string;
}
export const ROWS: SaleRow[] = [
  {
    order: 'SO-1001',
    product: 'Atlas Router',
    amountUsd: 7_800,
    region: 'North America',
    category: 'Hardware',
    salesRep: 'Avery',
    closedDate: '2026-08-03',
  },
  {
    order: 'SO-1002',
    product: 'Support Suite',
    amountUsd: 3_100,
    region: 'North America',
    category: 'Software License',
    salesRep: 'Morgan',
    closedDate: '2026-08-05',
  },
  {
    order: 'SO-1003',
    product: 'Edge Switch',
    amountUsd: 5_450,
    region: 'Europe',
    category: 'Hardware',
    salesRep: 'Jordan',
    closedDate: '2026-08-08',
  },
  {
    order: 'SO-1004',
    product: 'Compute Node',
    amountUsd: 12_300,
    region: 'North America',
    category: 'Hardware',
    salesRep: 'Sam',
    closedDate: '2026-08-11',
  },
  {
    order: 'SO-1005',
    product: 'Analytics Pro',
    amountUsd: 8_900,
    region: 'Asia Pacific',
    category: 'Software License',
    salesRep: 'Taylor',
    closedDate: '2026-08-16',
  },
  {
    order: 'SO-1006',
    product: 'Secure Gateway',
    amountUsd: 6_250,
    region: 'North America',
    category: 'Hardware',
    salesRep: 'Riley',
    closedDate: '2026-08-20',
  },
];
