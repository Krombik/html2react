import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import HTML2React from '../src/HTML2React/index.ts';
import styleConverter from '../src/styleConverter/index.ts';
import type {
  HTML2ReactProps,
  Meta,
  MetaProps,
  Segment,
} from '../src/types.ts';

const render = (props: HTML2ReactProps) =>
  renderToStaticMarkup(HTML2React(props) as any);

/** react logs invalid-prop warnings to console.error, expected in pass-through tests */
const silent = <T>(fn: () => T) => {
  const { error } = console;

  console.error = () => {};

  try {
    return fn();
  } finally {
    console.error = error;
  }
};

describe('structure', () => {
  it('renders plain text', () => {
    assert.equal(render({ html: 'just text' }), 'just text');
  });

  it('renders a single element', () => {
    assert.equal(render({ html: '<p>x</p>' }), '<p>x</p>');
  });

  it('renders nested elements and siblings', () => {
    assert.equal(
      render({ html: '<ul><li><b>1</b></li><li><i>2</i></li></ul>' }),
      '<ul><li><b>1</b></li><li><i>2</i></li></ul>'
    );
  });

  it('renders text around and between elements', () => {
    assert.equal(
      render({ html: 'lead<p>a</p>mid<p>b</p>trail' }),
      'lead<p>a</p>mid<p>b</p>trail'
    );
  });

  it('renders multiple roots', () => {
    assert.equal(render({ html: '<p>1</p><p>2</p>' }), '<p>1</p><p>2</p>');
  });

  it('preserves whitespace', () => {
    assert.equal(render({ html: '<p> a  b </p>' }), '<p> a  b </p>');
  });

  it('closes void tags without a closing tag', () => {
    assert.equal(
      render({ html: '<div><br><img src="a.png"><hr/>t</div>' }),
      '<div><br/><img src="a.png"/><hr/>t</div>'
    );
  });

  it('keeps children of an unclosed tag', () => {
    assert.equal(render({ html: '<div><p>x' }), '<div><p>x</p></div>');
  });

  it('unwinds to the matching open tag on close', () => {
    assert.equal(
      render({ html: '<div><span>a</span></div><p>b</p>' }),
      '<div><span>a</span></div><p>b</p>'
    );
  });

  it('returns null for empty html', () => {
    assert.equal(HTML2React({ html: '' }), null);
  });

  it('returns a single node, not an array, for one root', () => {
    assert.equal(Array.isArray(HTML2React({ html: '<p>x</p>' })), false);
    assert.equal(Array.isArray(HTML2React({ html: '<p>1</p><p>2</p>' })), true);
  });
});

describe('attributes', () => {
  it('reads double, single and unquoted values', () => {
    assert.equal(
      render({ html: `<a href="/x" title='t' target=_blank>l</a>` }),
      '<a href="/x" title="t" target="_blank">l</a>'
    );
  });

  it('treats a bare attribute as "true"', () => {
    assert.equal(
      silent(() => render({ html: '<a download>l</a>' })),
      '<a download="true">l</a>'
    );
  });

  it('tolerates whitespace around = and between attributes', () => {
    assert.equal(
      render({ html: '<a   href = "/x"    title  =  t  >l</a>' }),
      '<a href="/x" title="t">l</a>'
    );
  });

  it('keeps > inside a quoted value', () => {
    assert.equal(
      render({ html: '<a title="x > y" href="/z">l</a>' }),
      '<a title="x &gt; y" href="/z">l</a>'
    );
  });

  it('keeps < inside a quoted value', () => {
    assert.equal(
      render({ html: '<a title="a<b>c" href="/z">l</a>' }),
      '<a title="a&lt;b&gt;c" href="/z">l</a>'
    );
  });

  it('lets a later duplicate attribute win', () => {
    assert.equal(render({ html: '<a id="1" id="2">l</a>' }), '<a id="2">l</a>');
  });

  it('passes unknown attributes through untouched', () => {
    assert.equal(
      silent(() => render({ html: '<div class="a" data-x="1">t</div>' })),
      '<div class="a" data-x="1">t</div>'
    );
  });

  it('handles an uppercase tag and attribute', () => {
    assert.equal(
      silent(() => render({ html: '<DIV ID="a">t</DIV>' })),
      '<DIV ID="a">t</DIV>'
    );
  });
});

describe('comments, doctype and stray <', () => {
  it('drops comments', () => {
    assert.equal(render({ html: '<div><!-- hi -->t</div>' }), '<div>t</div>');
  });

  it('drops a comment containing < and tags', () => {
    assert.equal(
      render({ html: '<div><!-- a < b --><!-- <span>x</span> -->t</div>' }),
      '<div>t</div>'
    );
  });

  it('drops the doctype', () => {
    assert.equal(render({ html: '<!doctype html><p>y</p>' }), '<p>y</p>');
  });

  it('keeps an unescaped < followed by a non-letter as text', () => {
    assert.equal(render({ html: 'a < b <p>c</p>' }), 'a &lt; b <p>c</p>');
    assert.equal(render({ html: '5<6 <p>x</p>' }), '5&lt;6 <p>x</p>');
    assert.equal(
      render({ html: '<p>a</p> < <p>b</p>' }),
      '<p>a</p> &lt; <p>b</p>'
    );
  });

  it('keeps a processing instruction as text', () => {
    assert.equal(
      render({ html: '<?xml version="1.0"?><p>y</p>' }),
      '&lt;?xml version=&quot;1.0&quot;?&gt;<p>y</p>'
    );
  });
});

describe('script', () => {
  it('moves inline code into dangerouslySetInnerHTML and emits no stray text', () => {
    assert.equal(
      render({ html: '<script>var a = 1 < 2;</script><p>y</p>' }),
      '<script>var a = 1 < 2;</script><p>y</p>'
    );
  });

  it('leaves an empty script alone', () => {
    assert.equal(
      render({ html: '<script src="x.js"></script><p>y</p>' }),
      '<script src="x.js"></script><p>y</p>'
    );
  });

  it('never nests a script', () => {
    const tree = HTML2React({
      html: '<script>a</script><script>b</script>',
    }) as any;

    assert.equal(tree.length, 2);
    assert.equal(tree[0].props.dangerouslySetInnerHTML.__html, 'a');
    assert.equal(tree[1].props.dangerouslySetInnerHTML.__html, 'b');
  });
});

describe('components option', () => {
  const Box = ({ children, ...rest }: any) =>
    createElement('section', rest, children);

  it('replaces a tag with a component', () => {
    assert.equal(
      render({ html: '<div id="a">t</div>', components: { div: Box } }),
      '<section id="a">t</section>'
    );
  });

  it('matches component keys case-insensitively', () => {
    assert.equal(
      render({ html: '<div>t</div>', components: { DiV: Box } }),
      '<section>t</section>'
    );
    assert.equal(
      render({ html: '<DIV>t</DIV>', components: { div: Box } }),
      '<section>t</section>'
    );
  });

  it('renders a non-html tag', () => {
    assert.equal(
      render({ html: '<my-box>t</my-box>', components: { 'my-box': Box } }),
      '<section>t</section>'
    );
  });

  it('falls back to getComponent with the raw tag', () => {
    const seen: string[] = [];

    assert.equal(
      render({
        html: '<Foo>t</Foo>',
        getComponent(tag) {
          seen.push(tag);

          return Box;
        },
      }),
      '<section>t</section>'
    );
    assert.deepEqual(seen, ['Foo']);
  });

  it('prefers components over getComponent', () => {
    assert.equal(
      render({
        html: '<div>t</div>',
        components: { div: Box },
        getComponent: () => 'article',
      }),
      '<section>t</section>'
    );
  });
});

describe('attributes and converters options', () => {
  it('renames attributes', () => {
    assert.equal(
      render({
        html: '<label class="a" for="b">t</label>',
        attributes: { class: 'className', for: 'htmlFor' },
      }),
      '<label class="a" for="b">t</label>'
    );
  });

  it('converts values and passes the raw tag', () => {
    const seen: Array<[string, string]> = [];

    assert.equal(
      render({
        html: '<img src="a.png" width="10">',
        converters: {
          width: (value, tag) => {
            seen.push([value, tag]);

            return Number(value) * 2;
          },
        },
      }),
      '<img src="a.png" width="20"/>'
    );
    assert.deepEqual(seen, [['10', 'img']]);
  });

  it('keys converters by the renamed attribute', () => {
    assert.equal(
      render({
        html: '<div class="a b">t</div>',
        attributes: { class: 'className' },
        converters: { className: (value) => value.toUpperCase() },
      }),
      '<div class="A B">t</div>'
    );
  });

  it('needs styleConverter for style, which would otherwise throw', () => {
    assert.throws(() => render({ html: '<div style="color: red">t</div>' }));
    assert.equal(
      render({
        html: '<div style="color: red; font-size: 12px">t</div>',
        converters: { style: styleConverter },
      }),
      '<div style="color:red;font-size:12px">t</div>'
    );
  });
});

describe('processTextSegment', () => {
  it('replaces a segment with a string', () => {
    assert.equal(
      render({
        html: '<p>a</p>b',
        processTextSegment: (segment) => segment.toUpperCase(),
      }),
      '<p>A</p>B'
    );
  });

  it('merges adjacent string segments and keeps elements separate', () => {
    const tree = HTML2React({
      html: '<p>a b</p>',
      processTextSegment: (segment) =>
        segment.split(' ').flatMap((word) => [word, createElement('br')]),
    }) as any;

    assert.deepEqual(
      tree.props.children.map((child: any) => child.type ?? child),
      ['a', 'br', 'b', 'br']
    );
  });

  it('drops empty, false, true, null and undefined, but keeps 0', () => {
    const segments: Segment[] = ['', false, true, null, undefined, 0, 'x'];

    assert.equal(
      render({ html: '<p>t</p>', processTextSegment: () => segments }),
      '<p>0x</p>'
    );
  });

  it('stringifies numbers', () => {
    assert.equal(
      render({ html: '<p>t</p>', processTextSegment: () => 42 }),
      '<p>42</p>'
    );
  });

  it('receives the parent meta when withMeta is on', () => {
    const seen: Array<string | undefined> = [];

    render({
      html: '<p>a<b>c</b></p>',
      withMeta: true,
      processTextSegment(segment, parentMeta) {
        seen.push(parentMeta.type as string);

        return segment;
      },
    });

    assert.deepEqual(seen, ['p', 'b']);
  });
});

describe('shouldBeIgnored', () => {
  it('drops an element by tag once it closes', () => {
    assert.equal(
      render({
        html: '<div><i>drop</i><b>keep</b></div>',
        shouldBeIgnored: (tag) => tag == 'i',
      }),
      '<div><b>keep</b></div>'
    );
  });

  it('receives the props of the element being closed', () => {
    const seen: Array<[string, any]> = [];

    render({
      html: '<div id="a"><span id="b">t</span></div>',
      shouldBeIgnored(tag, props) {
        seen.push([tag, props.id]);

        return false;
      },
    });

    assert.deepEqual(seen, [
      ['span', 'b'],
      ['div', 'a'],
    ]);
  });
});

describe('withMeta', () => {
  const Box: any = ({ _meta, children }: MetaProps & any) =>
    createElement('section', { 'data-index': _meta.index }, children);

  it('passes _meta only to components, never to html tags', () => {
    assert.equal(
      silent(() =>
        render({
          html: '<div><p>a</p><x-box>b</x-box></div>',
          components: { 'x-box': Box },
          withMeta: true,
        })
      ),
      '<div><p>a</p><section data-index="1">b</section></div>'
    );
  });

  it('builds a meta tree with index, type, parent and children', () => {
    let meta: Meta = undefined as any;

    render({
      html: '<div>t<x-box>b</x-box></div>',
      components: {
        'x-box': ((props: any) => ((meta = props._meta), null)) as any,
      },
      withMeta: true,
    });

    assert.equal(meta.index, 1);
    assert.equal(meta.parent!.type, 'div');
    assert.equal(meta.parent!.index, 0);
    assert.equal(meta.parent!.parent!.type, undefined);
    assert.equal(meta.parent!.children!.length, 2);
    assert.equal(meta.parent!.children![1], meta);
  });
});
