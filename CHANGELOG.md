# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `>` inside a quoted attribute value (`<a title="x > y">`) is no longer treated as the end of the tag.
- `<` inside a quoted attribute value (`<a title="a<b>c">`) no longer starts a new tag.
- Comments containing `<` or markup (`<!-- a < b -->`, `<!-- <span>x</span> -->`) are dropped instead of being partly parsed as elements.
- An inline `<script>` no longer emits a stray `"</script>"` text node after the script element.
- `styleConverter` no longer truncates values containing `:`, such as `background: url(http://a/b.png)`.
- `styleConverter` no longer turns a declaration without `:` into an empty-valued property.

### Changed

- Performance: ~1.3–1.5x faster parsing, and ~3.5x faster `styleConverter`. Attribute and tag scanning no longer runs regexes over a slice of the remaining document.
- The published bundle is ~20% smaller gzipped.
- The published `package.json` now sets `"type": "module"`. Without it Node parsed the ESM entry as CommonJS, so `import` from Node failed; bundlers were unaffected.
- An unescaped `<` immediately followed by a letter now opens a tag, as browsers do. `< `, `<5` and other non-letter cases are still kept as text. Both forms are invalid HTML — `&lt;` is required.
- `<?xml ... ?>` is kept as text instead of becoming a component named `?xml`.

### Removed

- The `lodash.noop` dependency. The package now has no runtime dependencies.

## 1.4.1 - 2024-11-21

## 1.4.0 - 2024-09-11

## 1.3.1 - 2024-08-02

## 1.3.0 - 2024-08-02

## 1.2.0 - 2024-05-15

## 1.1.0 - 2024-04-07

## 1.0.2 - 2023-08-27

## 1.0.1 - 2023-08-25

## 1.0.0 - 2023-08-24

- Initial release.
