import type { Note } from 'ag-grid-community';

/**
 * The built-in note editor popup's DOM. Pure DOM construction — the popup
 * lifecycle (addPopup / hideFunc / positioning) is owned by NotesService.
 */
export interface NotePopupDom {
  /** The element passed to `popupSvc.addPopup` as `eChild`. */
  root: HTMLElement;
  /** The text input: a textarea when editable, a read-only div otherwise. */
  textEl: HTMLTextAreaElement | HTMLDivElement;
  /** Present only when the note can be removed. */
  removeBtn: HTMLButtonElement | null;
  closeBtn: HTMLButtonElement;
  resizeHandle: HTMLElement;
}

export interface BuildNotePopupParams {
  note: Note | undefined;
  /** Whether the text is editable (note exists, not read-only, not suppressed)
   *  or the note can be created (no note, not suppressed). */
  canWriteText: boolean;
  canDelete: boolean;
}

/**
 * Build the note editor popup element: header (title + close), optional
 * metadata block (author/createdAt/updatedAt, rendered exactly as provided),
 * the text area (or read-only text), an optional Remove button and the
 * bottom-right resize handle.
 */
export function buildNotePopup(params: BuildNotePopupParams): NotePopupDom {
  const { note, canWriteText, canDelete } = params;
  const root = document.createElement('div');
  root.className = 'lgr-note-popup';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Note');

  // Header
  const header = document.createElement('div');
  header.className = 'lgr-note-popup-header';
  const title = document.createElement('span');
  title.className = 'lgr-note-popup-title';
  title.textContent = note?.author ?? 'Note';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'lgr-note-popup-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close note');
  closeBtn.textContent = '×';
  header.append(title, closeBtn);

  const body = document.createElement('div');
  body.className = 'lgr-note-popup-body';

  // Metadata (rendered exactly as provided by the data source)
  const metaLines: string[] = [];
  if (note?.createdAt != null && note.createdAt !== '') {
    metaLines.push(`Created: ${note.createdAt}`);
  }
  if (note?.updatedAt != null && note.updatedAt !== '') {
    metaLines.push(`Updated: ${note.updatedAt}`);
  }
  if (metaLines.length > 0) {
    const meta = document.createElement('div');
    meta.className = 'lgr-note-popup-meta';
    meta.textContent = metaLines.join('\n');
    body.appendChild(meta);
  }

  // Text
  let textEl: HTMLTextAreaElement | HTMLDivElement;
  if (canWriteText) {
    const textarea = document.createElement('textarea');
    textarea.className = 'lgr-note-popup-text';
    textarea.value = note?.text ?? '';
    textarea.placeholder = 'Add a note…';
    textEl = textarea;
  } else {
    const div = document.createElement('div');
    div.className = 'lgr-note-popup-text';
    div.textContent = note?.text ?? '';
    div.setAttribute('role', 'textbox');
    div.setAttribute('aria-readonly', 'true');
    textEl = div;
  }
  body.appendChild(textEl);

  // Footer (Remove button only when deletable)
  let removeBtn: HTMLButtonElement | null = null;
  if (canDelete) {
    removeBtn = document.createElement('button');
    removeBtn.className = 'lgr-note-popup-remove';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove Note';
    const footer = document.createElement('div');
    footer.className = 'lgr-note-popup-footer';
    footer.appendChild(removeBtn);
    body.appendChild(footer);
  }

  // Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'lgr-note-popup-resize';
  resizeHandle.setAttribute('aria-hidden', 'true');

  root.append(header, body, resizeHandle);
  return { root, textEl, removeBtn, closeBtn, resizeHandle };
}

/**
 * Update an open popup's content from a fresh note access (called when the
 * underlying note changes while the popup is open): title, metadata and —
 * only when the editor is not focused — the text.
 */
export function syncNotePopupContent(dom: NotePopupDom, note: Note | undefined): void {
  const title = dom.root.querySelector<HTMLElement>('.lgr-note-popup-title');
  if (title) {
    title.textContent = note?.author ?? 'Note';
  }
  const meta = dom.root.querySelector<HTMLElement>('.lgr-note-popup-meta');
  const lines: string[] = [];
  if (note?.createdAt != null && note.createdAt !== '') {
    lines.push(`Created: ${note.createdAt}`);
  }
  if (note?.updatedAt != null && note.updatedAt !== '') {
    lines.push(`Updated: ${note.updatedAt}`);
  }
  if (meta) {
    if (lines.length === 0) {
      meta.remove();
    } else {
      meta.textContent = lines.join('\n');
    }
  } else if (lines.length > 0) {
    const body = dom.root.querySelector<HTMLElement>('.lgr-note-popup-body');
    const created = document.createElement('div');
    created.className = 'lgr-note-popup-meta';
    created.textContent = lines.join('\n');
    body?.prepend(created);
  }
  if (isEditableText(dom.textEl) && document.activeElement !== dom.textEl) {
    dom.textEl.value = note?.text ?? '';
  }
}

export function isEditableText(el: HTMLTextAreaElement | HTMLDivElement): el is HTMLTextAreaElement {
  return el instanceof HTMLTextAreaElement;
}

/**
 * Wire a bottom-right drag handle that resizes the popup element. The handle
 * is a plain mouse drag (no pointer events needed): mousedown on the handle,
 * mousemove/mouseup on the document.
 */
export function attachNotePopupResize(
  root: HTMLElement,
  handle: HTMLElement,
): () => void {
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let dragging = false;

  const onMouseMove = (event: MouseEvent): void => {
    if (!dragging) {
      return;
    }
    const width = Math.max(180, startWidth + (event.clientX - startX));
    const height = Math.max(80, startHeight + (event.clientY - startY));
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    event.preventDefault();
  };

  const onMouseUp = (): void => {
    if (!dragging) {
      return;
    }
    dragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  const onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startWidth = root.offsetWidth || 300;
    startHeight = root.offsetHeight || 120;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    event.preventDefault();
    event.stopPropagation();
  };

  handle.addEventListener('mousedown', onMouseDown);
  return () => {
    handle.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}
