#!/usr/bin/env node
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageName = process.argv[2];
if (!packageName || !/^[a-z0-9-]+$/.test(packageName)) {
  throw new Error('Usage: clean-package-dist.mjs <package-directory-name>');
}

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = join(repositoryRoot, 'packages', packageName);
if (!existsSync(join(packageDirectory, 'package.json'))) {
  throw new Error(`Refusing to clean unknown package: ${packageName}`);
}

// The validated target is always exactly packages/<name>/dist.
rmSync(join(packageDirectory, 'dist'), { recursive: true, force: true });
