export interface Workshop {
  id: string;
  venue: string;
  craft: string;
  session: string;
  shift: string;
  seats: number;
  minutes: number;
  stations: number;
  priority: number;
  kits: number;
  briefing: string;
}
export const initialRows: Workshop[] = [
  {
    id: 'carve',
    venue: 'Foundry',
    craft: 'Wood',
    session: 'Spoon carving',
    shift: 'Morning',
    seats: 8,
    minutes: 45,
    stations: 2,
    priority: 2,
    kits: 12,
    briefing: 'Bring gloves',
  },
  {
    id: 'print',
    venue: 'Foundry',
    craft: 'Paper',
    session: 'Block printing',
    shift: 'Morning',
    seats: 16,
    minutes: 60,
    stations: 1,
    priority: 1,
    kits: 18,
    briefing: 'Wear an apron',
  },
  {
    id: 'bind',
    venue: 'Foundry',
    craft: 'Paper',
    session: 'Bookbinding',
    shift: 'Evening',
    seats: 24,
    minutes: 75,
    stations: 3,
    priority: 3,
    kits: 6,
    briefing: 'Tools provided',
  },
  {
    id: 'clay',
    venue: 'Orchard',
    craft: 'Clay',
    session: 'Pinch pots',
    shift: 'Morning',
    seats: 10,
    minutes: 60,
    stations: 2,
    priority: 1,
    kits: 6,
    briefing: 'Tools provided',
  },
  {
    id: 'weave',
    venue: 'Orchard',
    craft: 'Fibre',
    session: 'Loom weaving',
    shift: 'Evening',
    seats: 14,
    minutes: 90,
    stations: 2,
    priority: 2,
    kits: 12,
    briefing: 'Bring yarn',
  },
];
