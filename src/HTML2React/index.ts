import { createElement, type FC, type PropsWithChildren } from 'react';
import type { AnyComponent, HTML2ReactProps, Segment } from '../types';
import noop from 'lodash.noop';

export { type HTML2ReactProps };

const NON_WHITESPACE_CHARACTER = /\S/;

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

const createComponentGetter = (
  components: HTML2ReactProps['components']
): ((tag: string) => AnyComponent | void) => {
  if (components) {
    const map = new Map<string, AnyComponent>();

    const keys = Object.keys(components);

    for (let i = keys.length; i--; ) {
      const key = keys[i];

      map.set(key.toLowerCase(), components[key]);
    }

    return map.get.bind(map);
  }

  return noop;
};

const handleSegment = (segment: Segment, nodes: Node[]) => {
  if ((segment && segment !== true) || segment == 0) {
    const typeofSegment = typeof segment;

    if (typeofSegment == 'object') {
      nodes.push(segment as JSX.Element);
    } else {
      let l = nodes.length;

      if (l && typeof nodes[--l] != 'object') {
        nodes[l] += segment as string;
      } else {
        nodes.push(
          typeofSegment != 'number' ? (segment as string) : '' + segment
        );
      }
    }
  }
};

type Node = JSX.Element | string;

const HTML2React: FC<HTML2ReactProps> = ({
  html,
  components,
  attributes = {},
  converters = {},
  processTextSegment,
  getComponent = noop,
}) => {
  let start = 0;

  const _getComponent = createComponentGetter(components);

  const tagsQueue = new Array<string>(1);

  const root: Node[] = [];

  const childrenQueue = [root];

  const substring: String['substring'] = html.substring.bind(html);

  const _indexOf: String['indexOf'] = html.indexOf.bind(html);

  const search = (index: number, regexp: RegExp) =>
    index + _handleIndex(substring(index).search(regexp));

  const indexOf = (item: string, index: number) =>
    _handleIndex(_indexOf(item, index));

  const handleTextSegment: (
    nodes: Node[],
    start: number,
    end?: number
  ) => void = processTextSegment
    ? (nodes, start, end) => {
        let l = nodes.length;

        const segment = processTextSegment(substring(start, end), () => l++);

        if (Array.isArray(segment)) {
          for (let i = 0; i < segment.length; i++) {
            handleSegment(segment[i], nodes);
          }
        } else {
          handleSegment(segment, nodes);
        }
      }
    : (nodes, start, end) => {
        nodes.push(substring(start, end));
      };

  for (
    let index = _indexOf('<'),
      char: string,
      end: number,
      _next: number,
      tag: string,
      normalizedTag: string,
      attribute: string,
      value: string,
      props: PropsWithChildren<{ key: number; [key: string]: any }>,
      parentChildren = root;
    index != -1;
    parentChildren = childrenQueue[childrenQueue.length - 1]
  ) {
    end = _indexOf('>', index + 1);

    if (end > 0) {
      while (true) {
        _next = _indexOf('<', index + 1);

        if (_next > 0 && _next < end) {
          index = _next;
        } else {
          break;
        }
      }
    } else {
      break;
    }

    if (start != index) {
      handleTextSegment(parentChildren, start, index);
    }

    char = html[++index];

    if (char == '/') {
      tag = substring(index + 1, end).trim();

      for (let j = tagsQueue.length; j--; ) {
        if (tagsQueue[j] == tag) {
          tagsQueue.length = j;

          childrenQueue.length = j;

          break;
        }
      }
    } else if (char != '!') {
      tag = substring(
        index,
        (index = search(index + 1, HTML_SPECIAL_CHAR))
      ).trim();

      normalizedTag = tag.toLowerCase();

      index = search(index, NON_WHITESPACE_CHARACTER);

      props = {
        key: parentChildren.length,
      };

      while (end != index && html[index] != '/') {
        attribute = substring(
          index,
          (index = search(index + 1, HTML_ATTRIBUTE_CHAR))
        ).trim();

        if (attribute in attributes) {
          attribute = attributes[attribute];
        }

        char = html[index];

        if (char != '=' && char != '/' && char != '>') {
          index = search(index + 1, NON_WHITESPACE_CHARACTER);
        }

        if (html[index] == '=') {
          char = html[(index = search(index + 1, NON_WHITESPACE_CHARACTER))];

          const isWrapped = char == "'" || char == '"';

          const next = isWrapped
            ? indexOf(char, ++index)
            : search(index + 1, HTML_SPECIAL_CHAR);

          value = substring(index, next);

          index = search(next + (isWrapped as any), NON_WHITESPACE_CHARACTER);
        } else {
          value = 'true';
        }

        props[attribute] =
          attribute in converters ? converters[attribute](value, tag) : value;
      }

      if (normalizedTag != 'script') {
        if (!_isVoidTag(normalizedTag)) {
          childrenQueue.push((props.children = []));

          tagsQueue.push(tag);
        }
      } else {
        const str = substring(end + 1);

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

            end += indexOfScriptClosingTag + scriptClosingTag[0].length;
          }
        }
      }

      parentChildren.push(
        createElement(
          _getComponent(normalizedTag) || getComponent(tag) || tag,
          props
        )
      );
    } else if (html[++index] == '-' && html[++index] == '-') {
      end = indexOf('-->', index) + 2;
    }

    start = end + 1;

    index = _next;
  }

  if (start < html.length) {
    handleTextSegment(childrenQueue[childrenQueue.length - 1], start);
  }

  return root.length > 1 ? root : root[0];
};

export default HTML2React;
