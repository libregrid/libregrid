/**
 * Procedurally generated grid configurations for AI Toolkit training fixtures.
 *
 * These stand in for the unknown grids the shared LoRA has to work against, so
 * the point is variety, not realism in any one config: column count and order,
 * meaningful vs. opaque ids, headers that differ from ids, every data type,
 * capabilities switched off, and deliberately confusable header pairs.
 *
 * Deterministic: the same seed always yields the same corpus, so a fixture set
 * can be regenerated and diffed.
 */

/** Small deterministic PRNG (mulberry32) — no dependency, reproducible. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DOMAINS = [
  { ids: ['invoice_total', 'payment_state', 'due_date', 'is_paid', 'customer'], headers: ['Invoice Total', 'Payment Status', 'Due Date', 'Paid', 'Customer'] },
  { ids: ['sku', 'unit_price', 'stock_level', 'restock_date', 'discontinued'], headers: ['SKU', 'Unit Price', 'Stock Level', 'Restock Date', 'Discontinued'] },
  { ids: ['employee', 'salary', 'hired_on', 'is_manager', 'department'], headers: ['Employee', 'Salary', 'Hire Date', 'Manager', 'Department'] },
  { ids: ['ticket_id', 'priority', 'opened_at', 'resolved', 'assignee'], headers: ['Ticket', 'Priority', 'Opened', 'Resolved', 'Assignee'] },
  { ids: ['city', 'population', 'founded', 'coastal', 'country'], headers: ['City', 'Population', 'Founded', 'Coastal', 'Country'] },
  { ids: ['gross_revenue', 'net_revenue', 'quarter', 'audited', 'segment'], headers: ['Gross Revenue', 'Net Revenue', 'Quarter', 'Audited', 'Segment'] },
  { ids: ['flight', 'delay_minutes', 'departs_on', 'cancelled', 'origin'], headers: ['Flight', 'Delay (min)', 'Departs', 'Cancelled', 'Origin'] },
  { ids: ['course', 'enrolment', 'starts_on', 'certified', 'faculty'], headers: ['Course', 'Enrolment', 'Starts', 'Certified', 'Faculty'] },
];

const TYPES = ['text', 'number', 'date', 'boolean'];
const FILTER_FOR_TYPE = { text: 'agTextColumnFilter', number: 'agNumberColumnFilter', date: 'agDateColumnFilter', boolean: 'agSetColumnFilter' };

/** Opaque ids exercise the "no semantic meaning in the id" case. */
function opaqueId(random, index) {
  const prefixes = ['fld', 'x', 'c', 'attr', 'v'];
  return `${prefixes[Math.floor(random() * prefixes.length)]}${index}${Math.floor(random() * 90) + 10}`;
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/**
 * Build one grid configuration.
 *
 * `columns` are shaped like the snapshot the runtime produces, so they can be
 * fed straight to `buildAiEnvironment` without a live grid.
 */
export function makeGridConfig(index) {
  const random = rng(index * 7919 + 13);
  const domain = pick(random, DOMAINS);
  const width = 2 + Math.floor(random() * 11); // 2..12 columns
  const opaque = random() < 0.25;

  const columns = [];
  for (let i = 0; i < width; i++) {
    const source = i % domain.ids.length;
    const suffix = i >= domain.ids.length ? `_${Math.floor(i / domain.ids.length) + 1}` : '';
    const dataType = i < domain.ids.length ? TYPES[Math.min(source, 3)] : pick(random, TYPES);

    const colId = opaque ? opaqueId(random, i) : `${domain.ids[source]}${suffix}`;
    const headerName = `${domain.headers[source]}${suffix}`;

    // Capabilities are switched off often enough that the model must read them.
    const sortable = random() > 0.12;
    const hideable = random() > 0.1;
    const filterable = random() > 0.15;

    columns.push({
      colId,
      headerName,
      dataType,
      sortable,
      hideable,
      filterKind: filterable ? (dataType === 'boolean' ? 'set' : dataType) : null,
      colDefFilter: filterable ? FILTER_FOR_TYPE[dataType] : false,
    });
  }

  return { gridId: `grid-${String(index).padStart(3, '0')}`, columns };
}

export function makeGridConfigs(count) {
  return Array.from({ length: count }, (_, i) => makeGridConfig(i + 1));
}
