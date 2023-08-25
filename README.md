# html2react-parser

Lightweight library that allows you to convert HTML markup to React components on the client and server side, while providing flexibility in handling tags, attributes, and text segments.

## Installation

using npm:

```
npm install --save html2react-parser
```

or yarn:

```
yarn add html2react-parser
```

or pnpm:

```
pnpm add html2react-parser
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
  converters?: Record<string, (value: string) => any>;
  processTextSegment?(segment: string): string;
};

const HTML2React: FC<HTML2ReactProps>;
```

| Prop                  | Description                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `html`                | The HTML string to be converted into React components.                                                               |
| `components?`         | Custom tag components to replace HTML tags. If a component is not provided, the corresponding HTML tag will be used. |
| `attributes?`         | Map HTML attributes to corresponding React props. If the attribute is not specified, it will be passed as is.        |
| `converters?`         | Converters for processing attribute values. If no converter is provided, the property will be of type `string`.      |
| `processTextSegment?` | Method to process and transform string parts of HTML content.                                                        |

Example:

```jsx
import HTML2React from 'html2react-parser/HTML2React';

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
import HTML2React from 'html2react-parser/HTML2React';
import styleConverter from 'html2react-parser/styleConverter';

<HTML2React
  html='<p style="margin-top: 25px; margin-bottom:10px;">text</p>'
  converters={{ style: styleConverter }}
/>;
```

---

## License

MIT © [Krombik](https://github.com/Krombik)
