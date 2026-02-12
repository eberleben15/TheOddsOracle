#!/usr/bin/env node

/**
 * Post-install: sync generated Prisma client to node_modules/.prisma/client
 * so require('.prisma/client/default') from @prisma/client resolves without Turbopack aliases.
 * Prisma schema outputs to generated/prisma-client; we copy it to node_modules for resolution.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const generatedClient = path.join(projectRoot, 'generated', 'prisma-client');
const dotPrismaClient = path.join(projectRoot, 'node_modules', '.prisma', 'client');

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(generatedClient)) {
  console.log('⚠️  Generated Prisma client not found. Run: npx prisma generate');
  process.exit(0);
}

copyRecursive(generatedClient, dotPrismaClient);
console.log('✅ Synced generated/prisma-client → node_modules/.prisma/client');
