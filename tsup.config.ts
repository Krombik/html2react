import { defineConfig } from 'tsup';
import fs from 'fs/promises';
import { join, relative } from 'path';

const _filesToCopy = ['LICENSE', 'README.md'];

const _CHUNKS = '_chunks';

const _pickFrom = (obj: Record<string, any>, keys: string[]) =>
  keys.reduce<Record<string, any>>(
    (acc, key) => (obj[key] != null ? { ...acc, [key]: obj[key] } : acc),
    {}
  );

const _toRoot = (path: string) => `./${path}`;

const _getIndexFile = (path: string, ext: string) =>
  _toRoot(join(path, `./index.${ext}`));

type _Module = {
  types: string;
  default: string;
};

type _Export = {
  require: _Module;
  import: _Module;
};

type _Exports = Record<string, _Export>;

const _getExport = (path: string): _Exports => ({
  [path]: {
    require: {
      types: _getIndexFile(path, 'd.cts'),
      default: _getIndexFile(path, 'cjs'),
    },
    import: {
      types: _getIndexFile(path, 'd.ts'),
      default: _getIndexFile(path, 'js'),
    },
  },
});

const _getExports = async (path: string, obj: _Exports) => {
  const dirs = await fs.readdir(path);

  for (let i = 0; i < dirs.length; i++) {
    const folder = dirs[i];

    if (folder != _CHUNKS) {
      const folderPath = `${path}/${folder}`;

      if ((await fs.lstat(folderPath)).isDirectory()) {
        obj = {
          ...obj,
          ..._getExport(_toRoot(relative(outDir, folderPath))),
          ...(await _getExports(folderPath, obj)),
        };
      }
    }
  }

  return obj;
};

const outDir = 'build';

export default defineConfig((prevOptions) => ({
  ignoreWatch: [outDir],
  watch: prevOptions.watch,
  outDir,
  minify: false,
  entry: ['src/index.ts', `src/!(utils|types)/**/*.(ts|tsx)`],
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  treeshake: { preset: 'smallest' },
  cjsInterop: true,
  dts: true,
  format: ['cjs', 'esm'],
  platform: 'browser',
  external: ['react'],
  esbuildOptions: (options) => {
    options.chunkNames = `${_CHUNKS}/[name]-[hash]`;
  },
  async onSuccess() {
    await fs.writeFile(
      `${outDir}/package.json`,
      JSON.stringify(
        {
          ..._pickFrom(
            JSON.parse((await fs.readFile('package.json')).toString()),
            [
              'name',
              'version',
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
            ]
          ),
          publishConfig: {
            access: 'public',
          },
          main: _getIndexFile('./', 'cjs'),
          module: _getIndexFile('./', 'js'),
          types: _getIndexFile('./', 'd.ts'),
          exports: {
            './package.json': './package.json',
            ...(await _getExports(outDir, _getExport('.'))),
          },
          sideEffects: false,
        },
        undefined,
        2
      )
    );

    for (let i = 0; i < _filesToCopy.length; i++) {
      const fileName = _filesToCopy[i];

      await fs.copyFile(fileName, `${outDir}/${fileName}`);
    }
  },
}));
