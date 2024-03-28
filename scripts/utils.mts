import fs from 'fs/promises';

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
