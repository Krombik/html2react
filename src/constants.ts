/** @internal */
export const NON_WHITESPACE_CHARACTER = /[^\s]/;

/** @internal */
export const HTML_SPECIAL_CHAR = /[\s>/]/;

/** @internal */
export const HTML_ATTRIBUTE_CHAR = /[=\s>/]/;

/** @internal */
export const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
