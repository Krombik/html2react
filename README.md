# react-html-string-parser

Lightweight library that allows you to convert HTML markup to React components on the client and server side, while providing flexibility in handling tags, attributes, and text segments.

## Installation

using npm:

```
npm install --save react-html-string-parser
```

or yarn:

```
yarn add react-html-string-parser
```

or pnpm:

```
pnpm add react-html-string-parser
```

---

## API

- [HTML2React](#html2react)
- [styleConverter](#styleconverter)

### HTML2React

Component to convert HTML string into React components

```ts
type HTML2ReactProps = {
  html: string;
  components?: Record<
    string,
    ComponentType<Record<string, any>> | keyof JSX.IntrinsicElements
  >;
  attributes?: Record<string, string>;
  converters?: Record<string, (value: string, tag: string) => any>;
  processTextSegment?(segment: string, parentMeta: Meta): ReactNode;
  getComponent?(
    tag: string
  ):
    | ComponentType<Record<string, any>>
    | keyof JSX.IntrinsicElements
    | undefined;
  shouldBeIgnored?(tag: string, props: Record<string, any>): boolean;
  withMeta?: boolean;
};

const HTML2React: FC<HTML2ReactProps>;
```

| Prop                  | Description                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `html`                | The HTML string to be converted into React components.                                                                                                |
| `components?`         | Custom tag components to replace HTML tags. **Keys are not case sensitive**. If a component is not provided, the corresponding HTML tag will be used. |
| `getComponent?`       | Returns a component for the given tag if it is not found in `components`. If it returns `undefined`, the `tag` will be used as a component.           |
| `attributes?`         | Map HTML attributes to corresponding React props. If the attribute is not specified, it will be passed as is.                                         |
| `converters?`         | Converters for processing attribute values. If no converter is provided, the property will be of type `string`.                                       |
| `processTextSegment?` | Method to process and transform string parts of HTML content.                                                                                         |
| `shouldBeIgnored?`    | Determines if a tag should be ignored based on the tag name and its props.                                                                            |
| `withMeta?`           | If `true`, adds metadata to each component in the form of a `_meta` prop, allowing for additional contextual information.                             |

Example:

```jsx
import HTML2React from 'react-html-string-parser/HTML2React';

<HTML2React
  html='<div><h1>Title</h1><br><p>Paragraph</p><br /><button data-attribute="any" tabindex="1">Button</button>text</div>'
  components={{
    h1: ({ children }) => <h3>{children}</h3>,
    p: 'div',
    script: () => null,
  }}
  attributes={{ tabindex: 'tabIndex' }}
  converters={{ tabIndex: (value) => +value }}
/>;
```

> both lines below will have the same parse result
>
> ```js
> // the line below contains extra spaces, an unclosed `<p>` tag,
> // the `class` attribute is not quoted, the `disabled` attribute is a boolean
> '<div><p>Paragraph<button\n   class=any    disabled\n>Button</button>text</div>';
>
> '<div><p>Paragraph<button class="any" disabled="true">Button</button>text</p></div>';
> ```

### styleConverter

Converter for `style` attribute

```ts
const styleConverter: (value: string) => CSSProperties;
```

Example:

```js
import HTML2React from 'react-html-string-parser/HTML2React';
import styleConverter from 'react-html-string-parser/styleConverter';

<HTML2React
  html='<p style="margin-top: 25px; margin-bottom:10px;">text</p>'
  converters={{ style: styleConverter }}
/>;
```

---

## License

MIT © [Krombik](https://github.com/Krombik)
