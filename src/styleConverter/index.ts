import type { CSSProperties } from 'react';

const styleConverter = (value: string) => {
  const style: Record<string, string> = {};

  const l = value.length;

  for (let i = 0; i < l;) {
    let end = value.indexOf(';', i);

    if (end < 0) {
      end = l;
    }

    const colon = value.indexOf(':', i);

    if (colon > 0 && colon < end) {
      let j = i;

      let nameEnd = colon;

      while (value.charCodeAt(j) <= 32) {
        j++;
      }

      while (nameEnd > j && value.charCodeAt(nameEnd - 1) <= 32) {
        nameEnd--;
      }

      let key = '';

      for (; j < nameEnd; j++) {
        const char = value[j];

        key += char != '-' ? char : value[++j].toUpperCase();
      }

      if (key) {
        style[key] = value.substring(colon + 1, end).trim();
      }
    }

    i = end + 1;
  }

  return style as CSSProperties;
};

export default styleConverter;
