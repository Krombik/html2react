import { defineConfig } from 'tsdown';
import fs from 'fs/promises';
import { dirname } from 'path';

const outDir = 'build';

const _PACKAGE_JSON_FIELDS = [
  'name',
  'version',
  'type',
  'author',
  'description',
  'keywords',
  'repository',
  'license',
  'bugs',
  'homepage',
  'peerDependencies',
  'peerDependenciesMeta',
  'dependencies',
  'engines',
] as const;

const _getIndexFile = (path: string, ext: string) => `${path}/index.${ext}`;

const _getExport = (path: string) => ({
  require: {
    types: _getIndexFile(path, 'd.cts'),
    default: _getIndexFile(path, 'cjs'),
  },
  import: {
    types: _getIndexFile(path, 'd.ts'),
    default: _getIndexFile(path, 'js'),
  },
});

export default defineConfig({
  entry: ['src/index.ts', 'src/!(utils|types)/**/*.{ts,tsx}'],
  outDir,
  format: ['esm', 'cjs'],
  platform: 'browser',
  target: 'es2020',
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  exports: false,
  copy: ['LICENSE', 'README.md'],
  // mutates in place, returning an object would replace tsdown's defaults
  outputOptions(options) {
    const { chunkFileNames } = options;

    options.chunkFileNames =
      typeof chunkFileNames == 'function'
        ? (chunk) => `_chunks/${chunkFileNames(chunk)}`
        : `_chunks/${chunkFileNames}`;
  },
  async onSuccess({ entry }) {
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));

    const exports: Record<string, unknown> = {
      './package.json': './package.json',
    };

    const paths = Object.keys(entry).map((name) => {
      const dir = dirname(name);

      return dir == '.' ? '.' : `./${dir}`;
    });

    for (const path of paths.sort()) {
      exports[path] = _getExport(path);
    }

    await fs.writeFile(
      `${outDir}/package.json`,
      JSON.stringify(
        {
          ..._PACKAGE_JSON_FIELDS.reduce<Record<string, unknown>>(
            (acc, key) =>
              pkg[key] != null ? ((acc[key] = pkg[key]), acc) : acc,
            {}
          ),
          publishConfig: { access: 'public' },
          main: _getIndexFile('.', 'cjs'),
          module: _getIndexFile('.', 'js'),
          types: _getIndexFile('.', 'd.ts'),
          exports,
          sideEffects: false,
        },
        undefined,
        2
      )
    );
  },
});
