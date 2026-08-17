/** Attribute map for an XML element. Values are serialised with String(). */
export interface XmlAttributes {
  [name: string]: string | number | boolean;
}

/** Minimal element tree used to build SpreadsheetML parts. */
export interface XmlElement {
  /** Element (tag) name. */
  name: string;
  /** Element attributes. */
  attrs?: XmlAttributes;
  /** Child elements, in document order. */
  children?: XmlElement[];
  /** Character content. Omit (or null) when the element has none. */
  text?: string | null;
}
