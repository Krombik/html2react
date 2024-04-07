import {
  createElement,
  type FC,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import type { HTML2ReactProps } from '../types';

export { type HTML2ReactProps };

const NON_WHITESPACE_CHARACTER = /[^\s]/;

const HTML_SPECIAL_CHAR = /[\s>/]/;

const HTML_ATTRIBUTE_CHAR = /[=\s>/]/;

const VOID_TAGS = new Set([
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

const _isVoidTag: (tag: string) => boolean = VOID_TAGS.has.bind(VOID_TAGS);

const _handleIndex = (index: number) => {
  if (index < 0) {
    throw new Error('invalid html');
  }

  return index;
};

const HTML2React: FC<HTML2ReactProps> = ({
  html,
  components = {},
  attributes = {},
  converters = {},
  processTextSegment,
}) => {
  let start = 0;

  const tagsQueue = new Array<string>(1);

  const root: ReactNode[] = [];

  const childrenQueue = [root];

  const substring: String['substring'] = html.substring.bind(html);

  const _indexOf: String['indexOf'] = html.indexOf.bind(html);

  const search = (index: number, regexp: RegExp) =>
    index + _handleIndex(substring(index).search(regexp));

  const indexOf = (item: string, index: number) =>
    _handleIndex(_indexOf(item, index));

  const handleTextSegment: (
    nodes: ReactNode[],
    start: number,
    end?: number
  ) => void = processTextSegment
    ? (nodes, start, end) => {
        let l = nodes.length;

        const segment = processTextSegment(substring(start, end), () => l++);

        if (Array.isArray(segment)) {
          nodes.push(...segment);
        } else {
          nodes.push(segment);
        }
      }
    : (nodes, start, end) => {
        nodes.push(substring(start, end));
      };

  for (
    let index = _indexOf('<'), char: string;
    index != -1;
    index = _indexOf('<', index)
  ) {
    const parentChildren = childrenQueue[childrenQueue.length - 1];

    if (start != index) {
      handleTextSegment(parentChildren, start, index);
    }

    char = html[++index];

    if (char == '/') {
      start = ++index;

      index = indexOf('>', index);

      const tag = substring(start, index).trim();

      for (let j = tagsQueue.length; j--; ) {
        if (tagsQueue[j] == tag) {
          tagsQueue.length = j;

          childrenQueue.length = j;

          break;
        }
      }
    } else if (char != '!') {
      start = search(index, NON_WHITESPACE_CHARACTER);

      index = search(start, HTML_SPECIAL_CHAR);

      const tag = substring(start, index);

      const props: PropsWithChildren<{ key: number; [key: string]: any }> = {
        key: parentChildren.length,
      };

      while (true) {
        index = search(index, NON_WHITESPACE_CHARACTER);

        char = html[index];

        if (char == '/' || char == '>') {
          break;
        }

        start = index;

        index = search(index, HTML_ATTRIBUTE_CHAR);

        char = html[index];

        const htmlKey = substring(start, index);

        const key = htmlKey in attributes ? attributes[htmlKey] : htmlKey;

        let value;

        if (char != '=' && char != '/' && char != '>') {
          index = search(index + 1, NON_WHITESPACE_CHARACTER);
        }

        if (html[index] == '=') {
          index = search(index + 1, NON_WHITESPACE_CHARACTER);

          char = html[index];

          const isWrapped = char == "'" || char == '"';

          const next = isWrapped
            ? indexOf(char, ++index)
            : search(index, HTML_SPECIAL_CHAR);

          value = substring(index, next);

          index = next + (isWrapped as any);
        } else {
          value = 'true';
        }

        props[key] = key in converters ? converters[key](value, tag) : value;
      }

      if (html[index] == '/') {
        index++;
      }

      if (tag != 'script') {
        if (!_isVoidTag(tag)) {
          childrenQueue.push((props.children = []));

          tagsQueue.push(tag);
        }
      } else {
        const str = substring(index + 1);

        const scriptClosingTag = /<\/\s*script\s*>/.exec(str);

        if (scriptClosingTag) {
          const indexOfNextScriptOpenTag = str.search(/<\s*script\s*>/);

          const indexOfScriptClosingTag = scriptClosingTag.index;

          if (
            indexOfNextScriptOpenTag == -1 ||
            indexOfScriptClosingTag < indexOfNextScriptOpenTag
          ) {
            const code = str.substring(0, indexOfScriptClosingTag);

            if (code) {
              (
                props as JSX.IntrinsicElements['script']
              ).dangerouslySetInnerHTML = { __html: code };
            }

            index += indexOfScriptClosingTag + scriptClosingTag[0].length;
          }
        }
      }

      parentChildren.push(
        createElement(tag in components ? components[tag] : tag, props)
      );
    } else if (substring(++index, index + 7) == 'DOCTYPE') {
      index = indexOf('>', index + 7);
    } else {
      index = indexOf('-->', index) + 2;
    }

    start = ++index;
  }

  if (start < html.length) {
    handleTextSegment(childrenQueue[childrenQueue.length - 1], start);
  }

  return root.length > 1 ? root : root[0];
};

export default HTML2React;
