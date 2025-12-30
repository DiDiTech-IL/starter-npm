import fs from 'fs';
import path from 'path';

export function detectPackageManager(): 'npm' | 'yarn' | 'pnpm' {
  const cwd = process.cwd();

  // Check for lockfiles
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  
  // Default to npm
  return 'npm';
}
