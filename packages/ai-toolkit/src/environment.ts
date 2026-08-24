import type { AiColumnSnapshot, AiGridSnapshot } from './gridSnapshot';
import type { AiFilterOperator } from './capabilities';

/**
 * The canonical model environment: the exact `(context, tools)` pair sent to
 * the provider.
 *
 * This module is the contract shared with LoRA training. Training fixtures are
 * exported from this builder rather than re-implemented, because a corpus that
 * drifts from the runtime teaches the model a prompt it will never see. That
 * drift is not hypothetical — the first LibreGrid corpus was hand-copied from
 * an earlier `buildGridTools()` and no longer matches it.
 */
export interface GridAiEnvironment {
  context: string;
  tools: Record<string, unknown>[];
  /** Request-local reference (`c0`, `c1`, …) → real colId. Never leaves the toolkit. */
  columnRefs: Map<string, string>;
  /** Columns dropped to fit the token budget, for the "ask to narrow" path. */
  omittedColIds: string[];
  revision: string;
}

export interface BuildEnvironmentOptions {
  /**
   * Token ceiling for context + tools. Needle's KV window is 256 with a
   * persistent prefix sink, and `max_seq_len` is 2048; leaving room for the
   * query, reasoning and answer puts the practical ceiling here.
   */
  maxEnvironmentTokens?: number;
  /** The user request, used to rank columns when the grid does not fit. */
  prompt?: string;
}

export const DEFAULT_MAX_ENVIRONMENT_TOKENS = 1200;

/**
 * Token estimation.
 *
 * The real tokenizer is SentencePiece and cannot run in the browser, so these
 * are calibrated proxies. They are deliberately biased to *over*-estimate:
 * claiming an environment fits when it does not would silently truncate the
 * schema the model is grounding against, which is far worse than dropping a
 * column that would have fitted.
 *
 * Context and tool JSON are separate genres and tokenize very differently
 * (~2.0 vs ~3.4 characters per token), so they get separate divisors rather
 * than one global ratio that would have to be pessimistic enough for both.
 * Calibrated against the real tokenizer over 250 generated environments; the
 * measured samples in `__fixtures__/tokenCalibration.json` guard the fit.
 */
const CONTEXT_CHARS_PER_TOKEN = 1.7;
const TOOLS_CHARS_PER_TOKEN = 3.2;

export function estimateContextTokens(context: string): number {
  return Math.ceil(context.length / CONTEXT_CHARS_PER_TOKEN);
}

export function estimateToolsTokens(toolsJson: string): number {
  return Math.ceil(toolsJson.length / TOOLS_CHARS_PER_TOKEN);
}

/** Total tokens the environment will occupy in the model's prefix. */
export function estimateEnvironmentTokens(context: string, toolsJson: string): number {
  return estimateContextTokens(context) + estimateToolsTokens(toolsJson);
}

function operatorList(operators: readonly AiFilterOperator[]): string {
  return operators.join(',');
}

/** One line per column: everything the model needs, nothing it does not. */
function contextLine(ref: string, column: AiColumnSnapshot): string {
  const parts = [`${ref}`, `id=${column.colId}`, `header=${column.headerName}`, `type=${column.dataType}`];
  if (column.filter) parts.push(`filter:${operatorList(column.filter.operators)}`);
  if (column.sortable) parts.push('sort');
  if (column.hideable) parts.push('hide');
  if (column.description) parts.push(`desc=${column.description}`);
  if (column.synonyms?.length) parts.push(`aka=${column.synonyms.join(',')}`);
  return parts.join(' | ');
}

function buildContext(refs: [string, AiColumnSnapshot][]): string {
  return ['Grid columns:', ...refs.map(([ref, column]) => contextLine(ref, column))].join('\n');
}

/**
 * Capability-scoped tool schemas. A column only appears in a tool's enum when
 * that tool can actually act on it, so the model is never shown an action the
 * executor would have to reject.
 */
function buildTools(refs: [string, AiColumnSnapshot][]): Record<string, unknown>[] {
  const sortable = refs.filter(([, c]) => c.sortable).map(([ref]) => ref);
  const hideable = refs.filter(([, c]) => c.hideable).map(([ref]) => ref);
  const filterable = refs.filter(([, c]) => c.filter).map(([ref]) => ref);
  const operators = [...new Set(refs.flatMap(([, c]) => c.filter?.operators ?? []))];

  const tools: Record<string, unknown>[] = [];

  if (filterable.length > 0) {
    tools.push({
      name: 'setFilter',
      description: 'Keep only the rows matching every condition. Replaces the current filter.',
      parameters: {
        type: 'object',
        required: ['conditions'],
        properties: {
          conditions: {
            type: 'array',
            description: 'conditions, all of which must hold',
            items: {
              type: 'object',
              required: ['column', 'operator'],
              properties: {
                column: { type: 'string', enum: filterable, description: 'column reference' },
                operator: { type: 'string', enum: operators, description: 'comparison to apply' },
                operands: { type: 'array', description: 'values for the comparison' },
              },
            },
          },
        },
      },
    });
  }

  if (sortable.length > 0) {
    tools.push({
      name: 'setSort',
      description: 'Sort the rows by one or more columns, in priority order.',
      parameters: {
        type: 'object',
        required: ['sortModel'],
        properties: {
          sortModel: {
            type: 'array',
            description: 'columns to sort by; empty array clears the sort',
            items: {
              type: 'object',
              required: ['column'],
              properties: {
                column: { type: 'string', enum: sortable, description: 'column reference' },
                direction: { type: 'string', enum: ['asc', 'desc'], description: 'asc = smallest first' },
              },
            },
          },
        },
      },
    });
  }

  if (hideable.length > 0) {
    tools.push({
      name: 'setColumnVisibility',
      description: 'Hide or show columns.',
      parameters: {
        type: 'object',
        properties: {
          hide: { type: 'array', items: { type: 'string', enum: hideable }, description: 'column references to hide' },
          show: { type: 'array', items: { type: 'string', enum: hideable }, description: 'column references to show' },
        },
      },
    });
  }

  tools.push({
    name: 'resetGrid',
    description: 'Clear all filters, sorting and column visibility changes.',
    parameters: { type: 'object', properties: {} },
  });

  return tools;
}

/**
 * Score a column against the prompt so the most plausible candidates survive
 * when a wide grid will not fit. Deliberately simple lexical overlap — this
 * only has to order columns, and it must be cheap and deterministic.
 */
function relevance(column: AiColumnSnapshot, promptWords: Set<string>): number {
  if (promptWords.size === 0) return 0;
  const haystack = [column.colId, column.headerName, column.description ?? '', ...(column.synonyms ?? [])]
    .join(' ')
    .toLowerCase();
  let score = 0;
  for (const word of promptWords) {
    if (haystack.includes(word)) score += word.length;
  }
  return score;
}

function words(prompt: string): Set<string> {
  return new Set(
    prompt
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      // Short words are noise, but a short *number* is often the only thing
      // separating "Column 7" from "Column 70" — keep every digit run.
      .filter((word) => word.length > 2 || /^\d+$/.test(word)),
  );
}

function environmentTokens(refs: [string, AiColumnSnapshot][]): number {
  return estimateEnvironmentTokens(buildContext(refs), JSON.stringify(buildTools(refs)));
}

/**
 * Build the environment for one request.
 *
 * Columns are addressed by request-local references (`c0`, `c1`, …) rather
 * than their real ids: it keeps the prompt small, gives the model a stable
 * output vocabulary across grids it was never trained on, and means a
 * hallucinated reference cannot name a real column by accident.
 */
export function buildAiEnvironment(snapshot: AiGridSnapshot, options: BuildEnvironmentOptions = {}): GridAiEnvironment {
  const budget = options.maxEnvironmentTokens ?? DEFAULT_MAX_ENVIRONMENT_TOKENS;

  // Only columns the toolkit can do something with are worth prompt space.
  const actionable = snapshot.columns.filter((c) => c.filter || c.sortable || c.hideable);
  let kept = actionable;

  if (environmentTokens(assignRefs(kept)) > budget) {
    const promptWords = words(options.prompt ?? '');
    const ranked = [...actionable].sort((a, b) => relevance(b, promptWords) - relevance(a, promptWords));
    // Drop the least relevant column until it fits; never go below one.
    kept = ranked;
    while (kept.length > 1 && environmentTokens(assignRefs(kept)) > budget) {
      kept = kept.slice(0, -1);
    }
    // Restore the grid's own column order among the survivors — position
    // carries meaning to a reader, and stable ordering keeps prompts cacheable.
    const survivors = new Set(kept.map((c) => c.colId));
    kept = actionable.filter((c) => survivors.has(c.colId));
  }

  const refs = assignRefs(kept);
  const keptIds = new Set(kept.map((c) => c.colId));

  return {
    context: buildContext(refs),
    tools: buildTools(refs),
    columnRefs: new Map(refs.map(([ref, column]) => [ref, column.colId])),
    omittedColIds: snapshot.columns.filter((c) => !keptIds.has(c.colId)).map((c) => c.colId),
    revision: snapshot.revision,
  };
}

function assignRefs(columns: readonly AiColumnSnapshot[]): [string, AiColumnSnapshot][] {
  return columns.map((column, index) => [`c${index}`, column]);
}
