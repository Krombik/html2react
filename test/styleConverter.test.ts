import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import styleConverter from '../src/styleConverter/index.ts';

describe('styleConverter', () => {
  it('camel cases property names', () => {
    assert.deepEqual(styleConverter('color: red; font-size: 12px'), {
      color: 'red',
      fontSize: '12px',
    });
  });

  it('trims around names and values', () => {
    assert.deepEqual(styleConverter('  display : flex  ;  gap : 2px  '), {
      display: 'flex',
      gap: '2px',
    });
  });

  it('keeps vendor prefixes capitalised, as react expects', () => {
    assert.deepEqual(styleConverter('-webkit-transform: scale(2)'), {
      WebkitTransform: 'scale(2)',
    });
  });

  it('keeps colons inside the value', () => {
    assert.deepEqual(
      styleConverter('background: url(http://a/b.png) no-repeat'),
      {
        background: 'url(http://a/b.png) no-repeat',
      }
    );
  });

  it('skips empty and colon-less declarations', () => {
    assert.deepEqual(styleConverter(''), {});
    assert.deepEqual(styleConverter(';;'), {});
    assert.deepEqual(styleConverter('color:red;;font-weight:bold;'), {
      color: 'red',
      fontWeight: 'bold',
    });
    assert.deepEqual(styleConverter('nonsense'), {});
  });

  it('accepts a declaration with no trailing semicolon', () => {
    assert.deepEqual(styleConverter('margin-top:1px'), { marginTop: '1px' });
  });

  it('lets a later declaration win', () => {
    assert.deepEqual(styleConverter('color:red;color:blue'), { color: 'blue' });
  });
});
