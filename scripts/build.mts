import fs from 'fs/promises';
import { build } from 'tsup';
import ts from 'typescript';
import { handleChild } from './utils.mjs';

const run = async (outDir: string) => {
  await fs.rm(outDir, { recursive: true, force: true });

  if (
    ts
      .createProgram(['src/index.ts'], {
        emitDeclarationOnly: true,
        declaration: true,
        stripInternal: true,
        strictNullChecks: true,
        jsx: ts.JsxEmit.React,
        outDir,
      })
      .emit().emitSkipped
  ) {
    throw new Error('TypeScript compilation failed');
  }

  const children = await fs.readdir(outDir);

  for (let i = 0; i < children.length; i++) {
    const file = children[i];

    const path = `${outDir}/${file}`;

    await handleChild(path);
  }

  await build({
    outDir,
    minify: false,
    entry: ['src/index.ts', `src/!(utils|types)/**/*.(ts|tsx)`],
    splitting: true,
    sourcemap: true,
    clean: false,
    target: 'es2020',
    treeshake: { preset: 'smallest' },
    dts: false,
    format: ['cjs', 'esm'],
    platform: 'browser',
    external: ['react'],
    esbuildOptions: (options) => {
      options.chunkNames = '_chunks/[ext]/[name]-[hash]';
    },
    watch: process.argv.includes('--watch'),
  });
};

run('build');
