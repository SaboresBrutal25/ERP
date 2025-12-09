import fs from 'fs';
import path from 'path';
import { dataDir } from './config.js';

const ensureDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const filePath = (resource) => path.join(dataDir, `${resource}.json`);

export const loadRows = (resource) => {
  ensureDir();
  const file = filePath(resource);
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8');
  if (!content.trim()) return [];
  try {
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error parsing ${file}:`, err);
    return [];
  }
};

export const saveRows = (resource, rows) => {
  ensureDir();
  const file = filePath(resource);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
  return rows;
};
