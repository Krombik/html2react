import { CSSProperties } from 'react';

const toCamelCase = (str: string) => {
  const arr = str.split('-');

  let res = arr[0];

  for (let i = 1; i < arr.length; i++) {
    const item = arr[i];

    res += item[0].toUpperCase() + item.substring(1);
  }

  return res;
};

const styleConverter = (value: string) =>
  value.split(';').reduce<CSSProperties>((acc, item) => {
    if (!item) {
      return acc;
    }

    const t = item.split(':');

    return { ...acc, [toCamelCase(t[0].trim())]: (t[1] || '').trim() };
  }, {});

export default styleConverter;
