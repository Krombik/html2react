import type { CSSProperties } from 'react';

const styleConverter = (value: string) =>
  value.split(';').reduce<CSSProperties>((acc, item) => {
    if (!item) {
      return acc;
    }

    const t = item.split(':');

    const arr = t[0].trim().split('-');

    let key = arr[0];

    for (let i = 1; i < arr.length; i++) {
      const item = arr[i];

      key += item[0].toUpperCase() + item.substring(1);
    }

    return { ...acc, [key]: (t[1] || '').trim() };
  }, {});

export default styleConverter;
