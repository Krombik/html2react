import React, { ComponentType, FC, PropsWithChildren, ReactNode } from 'react';
import {
  HTML_ATTRIBUTE_CHAR,
  HTML_SPECIAL_CHAR,
  NON_WHITESPACE_CHARACTER,
  VOID_TAGS,
} from '../constants';
import { Converters, HTMLAttributes2ReactProps } from '../types';
import identity from 'lodash.identity';

export type HTML2ReactProps = {
  /** The HTML content to be converted to React components. */
  html: string;
  /** Custom tag components to replace HTML tags. If a component is not provided, the corresponding HTML tag will be used. */
  components?: Partial<
    Record<
      keyof JSX.IntrinsicElements,
      ComponentType<Record<string, any>> | keyof JSX.IntrinsicElements
    >
  > &
    Record<
      string,
      ComponentType<Record<string, any>> | keyof JSX.IntrinsicElements
    >;
  /** Map HTML attributes to corresponding React props. If the attribute is not specified, it will be passed as is. */
  attributes?: Partial<HTMLAttributes2ReactProps> & Record<string, string>;
  /** Converters for processing attribute values. If no converter is provided, the property will be of type string. */
  converters?: Converters;
  /**
   * Process text segments within the HTML content.
   * @param segment - The text segment to be processed.
   * @returns The processed text segment.
   */
  processTextSegment?(segment: string): string;
};

const HTML2React: FC<HTML2ReactProps> = ({
  html,
  components = {},
  attributes = {},
  converters = {},
  processTextSegment = identity,
}) => {
  let start = 0;

  const tagsQueue = new Array<string>(1);

  const childrenQueue: ReactNode[][] = [[]];

  const search = (index: number, regexp: RegExp) => {
    const next = html.substring(index).search(regexp);

    if (next < 0) {
      throw new Error('invalid html');
    }

    return index + next;
  };

  const indexOf = (item: string, index: number) => {
    index = html.indexOf(item, index);

    if (index < 0) {
      throw new Error('invalid html');
    }

    return index;
  };

  for (
    let index = html.indexOf('<'), char: string;
    index != -1;
    index = html.indexOf('<', index)
  ) {
    const parentChildren = childrenQueue[childrenQueue.length - 1];

    if (start != index) {
      parentChildren.push(processTextSegment(html.substring(start, index)));
    }

    char = html[++index];

    if (char == '/') {
      start = ++index;

      index = indexOf('>', index);

      const tag = html.substring(start, index).trim();

      for (let j = tagsQueue.length; j--; ) {
        if (tagsQueue[j] == tag) {
          tagsQueue.length = j;

          childrenQueue.length = j;

          break;
        }
      }
    } else if (char != '!') {
      start = index;

      index = search(index, HTML_SPECIAL_CHAR);

      const tag = html.substring(start, index);

      const Component = components[tag] || tag;

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

        const htmlKey = html.substring(start, index);

        const key = attributes[htmlKey] || htmlKey;

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

          value = html.substring(index, next);

          index = next + (isWrapped as any);
        } else {
          value = 'true';
        }

        props[key] = key in converters ? converters[key](value) : value;
      }

      if (html[index] == '/') {
        index++;
      }

      if (tag != 'script') {
        if (!VOID_TAGS.has(tag)) {
          childrenQueue.push((props.children = []));

          tagsQueue.push(tag);
        }
      } else {
        const str = html.substring(index + 1);

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

      parentChildren.push(<Component {...props} />);
    } else {
      index = indexOf('-->', index + 1) + 2;
    }

    start = ++index;
  }

  if (start < html.length) {
    childrenQueue[childrenQueue.length - 1].push(
      processTextSegment(html.substring(start))
    );
  }

  return <>{childrenQueue[0]}</>;
};

export default HTML2React;
