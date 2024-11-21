import { createElement, type FC, type PropsWithChildren } from 'react';
import type {
  AnyComponent,
  HTML2ReactProps,
  Meta,
  MetaProps,
  Segment,
} from '../types';
import noop from 'lodash.noop';

export { type HTML2ReactProps, type MetaProps };

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

const handleSegment = (
  segment: Segment,
  nodesChildren: NodeChildren[],
  parentMeta: Meta | false | undefined
) => {
  if ((segment && segment !== true) || segment === 0) {
    const typeofSegment = typeof segment;

    let l = nodesChildren.length;

    if (typeofSegment == 'object') {
      nodesChildren.push({ ...(segment as JSX.Element), key: l as any });

      if (parentMeta) {
        parentMeta.children!.push({
          index: l,
          type: (segment as JSX.Element).type,
          parent: parentMeta,
        });
      }
    } else {
      if (l && typeof nodesChildren[--l] != 'object') {
        nodesChildren[l] += segment as string;
      } else {
        nodesChildren.push(
          typeofSegment != 'number' ? (segment as string) : '' + segment
        );

        if (parentMeta) {
          parentMeta.children!.length++;
        }
      }
    }
  }
};

type NodeChildren = JSX.Element | string;

const HTML2React: FC<HTML2ReactProps> = ({
  html,
  components,
  attributes = {},
  converters = {},
  processTextSegment,
  getComponent = noop,
  shouldBeIgnored,
  withMeta,
}) => {
  let start = 0;

  let currentNodeChildren: NodeChildren[] = [];

  let currentMeta = withMeta && ({ index: 0, children: [] } as Meta);

  const _getComponent = createComponentGetter(components);

  const rootNodeChildren = currentNodeChildren;

  const tagsQueue: string[] = [];

  const metaQueue = [currentMeta];

  const nodesChildrenQueue = [rootNodeChildren];

  const substring: String['substring'] = html.substring.bind(html);

  const _indexOf: String['indexOf'] = html.indexOf.bind(html);

  const search = (index: number, regexp: RegExp) =>
    index + _handleIndex(substring(index).search(regexp));

  const indexOf = (item: string, index: number) =>
    _handleIndex(_indexOf(item, index));

  const handleTextSegment: (
    nodesChildren: NodeChildren[],
    parentMeta: Meta | false | undefined,
    text: string
  ) => void = processTextSegment
    ? (nodesChildren, parentMeta, text) => {
        const segment = processTextSegment(text, parentMeta as Meta);

        if (Array.isArray(segment)) {
          for (let i = 0; i < segment.length; i++) {
            handleSegment(segment[i], nodesChildren, parentMeta);
          }
        } else {
          handleSegment(segment, nodesChildren, parentMeta);
        }
      }
    : (nodesChildren, parentMeta, text) => {
        nodesChildren.push(text);

        if (parentMeta) {
          parentMeta.children!.length++;
        }
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
      props: PropsWithChildren<
        { key: number; [key: string]: any } & Partial<MetaProps>
      >,
      component: AnyComponent | string,
      meta: Meta,
      parentChildren = currentNodeChildren;
    index != -1;
    parentChildren = currentNodeChildren
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
      handleTextSegment(
        currentNodeChildren,
        currentMeta,
        substring(start, index)
      );
    }

    char = html[++index];

    if (char == '/') {
      tag = substring(index + 1, end).trim();

      for (let j = tagsQueue.length; j--; ) {
        if (tagsQueue[j] == tag) {
          metaQueue.length = nodesChildrenQueue.length = j + 1;

          tagsQueue.length = j;

          currentNodeChildren = nodesChildrenQueue[j];

          currentMeta = metaQueue[j];

          if (
            shouldBeIgnored &&
            shouldBeIgnored(
              tag,
              (
                currentNodeChildren[
                  (j = currentNodeChildren.length - 1)
                ] as JSX.Element
              ).props
            )
          ) {
            currentNodeChildren.length = j;

            if (currentMeta) {
              currentMeta.children!.length = j;
            }
          }

          break;
        }
      }
    } else if (char != '!') {
      tag = substring(
        index,
        (index = search(index + 1, HTML_SPECIAL_CHAR))
      ).trim();

      normalizedTag = tag.toLowerCase();

      props = {
        key: currentNodeChildren.length,
      };

      component = _getComponent(normalizedTag) || getComponent(tag) || tag;

      if (currentMeta) {
        meta = {
          type: component,
          index: props.key,
          parent: currentMeta,
        };

        currentMeta.children!.push(meta);

        if (typeof component != 'string') {
          props._meta = meta;
        }
      }

      index = search(index, NON_WHITESPACE_CHARACTER);

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
          tagsQueue.push(tag);

          nodesChildrenQueue.push((currentNodeChildren = props.children = []));

          if (currentMeta) {
            meta!.children = [];

            metaQueue.push((currentMeta = meta!));
          }
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

      parentChildren.push(createElement(component, props));
    } else if (html[++index] == '-' && html[++index] == '-') {
      end = indexOf('-->', index) + 2;
    }

    start = end + 1;

    index = _next;
  }

  if (start < html.length) {
    handleTextSegment(currentNodeChildren, currentMeta, substring(start));
  }

  return rootNodeChildren.length
    ? rootNodeChildren.length > 1
      ? rootNodeChildren
      : rootNodeChildren[0]
    : null;
};

export default HTML2React;
