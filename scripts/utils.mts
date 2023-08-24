import fs from 'fs/promises';

const NESTED_PACKAGE_JSON = JSON.stringify(
  {
    sideEffects: false,
    module: './index.js',
    main: './index.cjs',
    types: './index.d.ts',
  },
  undefined,
  2
);

export const addNestedPackagesJson = async (path: string) => {
  const dirs = await fs.readdir(path);

  for (let i = 0; i < dirs.length; i++) {
    const folder = dirs[i];

    const folderPath = `${path}/${folder}`;

    if ((await fs.lstat(folderPath)).isDirectory()) {
      const nested = await fs.readdir(folderPath);

      if (nested.includes('index.d.ts')) {
        await fs.writeFile(`${folderPath}/package.json`, NESTED_PACKAGE_JSON);
      }

      await addNestedPackagesJson(folderPath);
    }
  }
};

const pickFrom = (obj: Record<string, any>, keys: string[]) =>
  keys.reduce<Record<string, any>>(
    (acc, key) => (obj[key] != null ? { ...acc, [key]: obj[key] } : acc),
    {}
  );

export const getMainPackageJson = async () =>
  JSON.stringify(
    {
      ...pickFrom(JSON.parse((await fs.readFile('package.json')).toString()), [
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
      ]),
      publishConfig: {
        access: 'public',
      },
      main: './index.cjs',
      module: './index.js',
      types: './index.d.ts',
      sideEffects: false,
    },
    undefined,
    2
  );

const handleDeclarationFile = async (path: string) => {
  if ((await fs.readFile(path)).toString() === 'export {};\n') {
    await fs.rm(path);
  }
};

export const handleChild = async (path: string) => {
  if (path.endsWith('.d.ts')) {
    await handleDeclarationFile(path);
  } else if ((await fs.lstat(path)).isDirectory()) {
    await handleFolder(path);
  }
};

const handleFolder = async (path: string) => {
  const nested = await fs.readdir(path);

  for (let i = 0; i < nested.length; i++) {
    await handleChild(`${path}/${nested[i]}`);
  }

  if (!(await fs.readdir(path)).length) {
    await fs.rmdir(path);
  }
};
