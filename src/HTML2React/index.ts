import { createElement, type FC, type PropsWithChildren } from 'react';
import type {
  AnyComponent,
  HTML2ReactProps,
  Meta,
  MetaProps,
  Segment,
} from '../types';

export { type HTML2ReactProps, type MetaProps };

const noop = () => {};

const VOID_TAGS = new Set(
  'area base br col embed hr img input link meta param source track wbr'.split(
    ' '
  )
);

/** matches both `<script>` and `</script>`, `$1` is set only for the closing one */
const SCRIPT_TAG = /<(\/?)\s*script\s*>/g;

const createComponentGetter = (
  components: HTML2ReactProps['components']
): ((tag: string) => AnyComponent | void) => {
  if (components) {
    const map = new Map<string, AnyComponent>();

    const keys = Object.keys(components);

    for (let i = keys.length; i--;) {
      const key = keys[i];

      map.set(key.toLowerCase(), components[key]);
    }

    return map.get.bind(map);
  }

  return noop;
};

const appendSegment = (
  segment: Segment,
  nodesChildren: NodeChildren[],
  parentMeta: Meta | undefined
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

const skipSpaces = (html: string, i: number) => {
  while (html.charCodeAt(i) <= 32) {
    i++;
  }

  return i;
};

/** stops on whitespace, `>` or `/` */
const findEnd = (html: string, i: number) => {
  let c: number;

  while (((c = html.charCodeAt(i)), c > 32 && c != 62 && c != 47)) {
    i++;
  }

  return i;
};

const appendProcessedText = (
  nodesChildren: NodeChildren[],
  text: string,
  parentMeta: Meta | undefined,
  processTextSegment: (segment: string, parentMeta: Meta) => Segment | Segment[]
) => {
  const segment = processTextSegment(text, parentMeta as Meta);

  if (Array.isArray(segment)) {
    for (let i = 0; i < segment.length; i++) {
      appendSegment(segment[i], nodesChildren, parentMeta);
    }
  } else {
    appendSegment(segment, nodesChildren, parentMeta);
  }
};

const appendText = (nodesChildren: NodeChildren[], text: string) => {
  nodesChildren.push(text);
};

const appendTextWithMeta = (
  nodesChildren: NodeChildren[],
  text: string,
  parentMeta: Meta
) => {
  nodesChildren.push(text);

  parentMeta.children!.length++;
};

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

  let currentMeta = withMeta ? ({ index: 0, children: [] } as Meta) : undefined;

  const _getComponent = createComponentGetter(components);

  const rootNodeChildren = currentNodeChildren;

  const tagsQueue: string[] = [];

  const metaQueue = [currentMeta];

  const nodesChildrenQueue = [rootNodeChildren];

  const handleTextSegment = (
    processTextSegment
      ? appendProcessedText
      : withMeta
        ? appendTextWithMeta
        : appendText
  ) as (
    nodesChildren: NodeChildren[],
    text: string,
    parentMeta?: Meta,
    processTextSegment?: (
      segment: string,
      parentMeta: Meta
    ) => Segment | Segment[]
  ) => void;

  for (
    let index = html.indexOf('<'),
      charCode: number,
      end: number,
      next: number,
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
    charCode = html.charCodeAt(index + 1);

    // only `<` followed by a letter, `/` or `!` opens a tag, everything else is text
    if (((charCode | 32) - 97) >>> 0 > 25 && charCode != 47 && charCode != 33) {
      index = html.indexOf('<', index + 1);

      continue;
    }

    end = html.indexOf('>', index + 1);

    if (end < 0) {
      break;
    }

    if (start != index) {
      handleTextSegment(
        currentNodeChildren,
        html.substring(start, index),
        currentMeta,
        processTextSegment
      );
    }

    index++;

    if (charCode == 47) {
      for (let j = tagsQueue.length; j--;) {
        tag = tagsQueue[j];

        if (
          html.startsWith(tag, index + 1) &&
          ((charCode = html.charCodeAt(index + 1 + tag.length)) <= 32 ||
            charCode == 62)
        ) {
          nodesChildrenQueue.length = j + 1;

          tagsQueue.length = j;

          currentNodeChildren = nodesChildrenQueue[j];

          if (currentMeta) {
            metaQueue.length = j + 1;

            currentMeta = metaQueue[j];
          }

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
    } else if (charCode != 33) {
      tag = html.substring(index, (index = findEnd(html, index + 1)));

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

      index = skipSpaces(html, index);

      while (index != end && html.charCodeAt(index) != 47) {
        next = index + 1;

        // inlined `findEnd`, stopping on `=` as well
        while (
          ((charCode = html.charCodeAt(next)),
          charCode > 32 && charCode != 62 && charCode != 47 && charCode != 61)
        ) {
          next++;
        }

        attribute = html.substring(index, (index = next));

        if (attribute in attributes) {
          attribute = attributes[attribute];
        }

        if (charCode <= 32) {
          charCode = html.charCodeAt((index = skipSpaces(html, index + 1)));
        }

        if (charCode == 61) {
          charCode = html.charCodeAt((index = skipSpaces(html, index + 1)));

          if (charCode == 39 || charCode == 34) {
            next = html.indexOf(html[index], ++index);

            value = html.substring(index, next++);

            if (next > end) {
              end = html.indexOf('>', next);
            }
          } else {
            value = html.substring(index, (next = findEnd(html, index + 1)));
          }

          index = skipSpaces(html, next);
        } else {
          value = 'true';
        }

        props[attribute] =
          attribute in converters ? converters[attribute](value, tag) : value;
      }

      if (normalizedTag != 'script') {
        if (!VOID_TAGS.has(normalizedTag)) {
          tagsQueue.push(tag);

          nodesChildrenQueue.push((currentNodeChildren = props.children = []));

          if (currentMeta) {
            meta!.children = [];

            metaQueue.push((currentMeta = meta!));
          }
        }
      } else {
        SCRIPT_TAG.lastIndex = end + 1;

        const scriptTag = SCRIPT_TAG.exec(html);

        if (scriptTag && scriptTag[1]) {
          const code = html.substring(end + 1, scriptTag.index);

          if (code) {
            (props as JSX.IntrinsicElements['script']).dangerouslySetInnerHTML =
              { __html: code };
          }

          end = scriptTag.index + scriptTag[0].length - 1;
        }
      }

      parentChildren.push(createElement(component, props));
    } else if (
      html.charCodeAt(++index) == 45 &&
      html.charCodeAt(++index) == 45
    ) {
      end = html.indexOf('-->', index) + 2;
    }

    start = end + 1;

    index = html.indexOf('<', start);
  }

  if (start < html.length) {
    handleTextSegment(
      currentNodeChildren,
      html.substring(start),
      currentMeta,
      processTextSegment
    );
  }

  return rootNodeChildren.length
    ? rootNodeChildren.length > 1
      ? rootNodeChildren
      : rootNodeChildren[0]
    : null;
};

export default HTML2React;
