import { copyFile, lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve(process.cwd(), 'out');
const nextSegmentDirectory = /^__next\.[^/\\]+$/;

let createdAliases = 0;
let existingAliases = 0;

async function ensureAlias(sourcePath, aliasPath) {
  try {
    const aliasStats = await lstat(aliasPath);
    if (!aliasStats.isFile()) {
      throw new Error(`Alias path exists and is not a file: ${aliasPath}`);
    }

    const [source, alias] = await Promise.all([readFile(sourcePath), readFile(aliasPath)]);
    if (!source.equals(alias)) {
      throw new Error(`Alias collision has different content: ${aliasPath}`);
    }

    existingAliases += 1;
    return;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      await copyFile(sourcePath, aliasPath);
      createdAliases += 1;
      return;
    }

    throw error;
  }
}

async function walkSegmentDirectory(segmentDirectory, aliasDirectory, segments) {
  const entries = await readdir(segmentDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(segmentDirectory, entry.name);

    if (entry.isDirectory()) {
      await walkSegmentDirectory(entryPath, aliasDirectory, [...segments, entry.name]);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.txt')) {
      const aliasName = `${segments.join('.')}.${entry.name}`;
      await ensureAlias(entryPath, path.join(aliasDirectory, aliasName));
    }
  }
}

async function walkOutputDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const entryPath = path.join(directory, entry.name);
    if (nextSegmentDirectory.test(entry.name)) {
      await walkSegmentDirectory(entryPath, directory, [entry.name]);
      continue;
    }

    await walkOutputDirectory(entryPath);
  }
}

try {
  const outputStats = await lstat(outputDirectory);
  if (!outputStats.isDirectory()) {
    throw new Error(`Static export output is not a directory: ${outputDirectory}`);
  }

  await walkOutputDirectory(outputDirectory);
  console.log(
    `prepare-assets: created ${createdAliases} RSC aliases; preserved ${existingAliases} existing aliases.`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`prepare-assets: ${message}`);
  process.exitCode = 1;
}
