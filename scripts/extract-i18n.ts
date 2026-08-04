import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_DIR = path.join(__dirname, '../src');
const I18N_DIR = path.join(__dirname, '../src/i18n');
const SUPPORTED_LANGS = ['uk', 'en'];

const KEY_REGEX =
  /['"]((?:errors|success|responses|auth|api)\.[a-zA-Z0-9_.-]+)['"]/g;

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (fullPath.endsWith('.ts')) {
      arrayOfFiles.push(fullPath);
    }
  }

  return arrayOfFiles;
}

function extractKeys(): Set<string> {
  const files = getAllFiles(SRC_DIR);
  const keys = new Set<string>();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = KEY_REGEX.exec(content)) !== null) {
      keys.add(match[1]);
    }
  }

  return keys;
}

function unflattenObject(keys: Set<string>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key of keys) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        if (!current[part]) {
          current[part] = `TODO: Translate ${key}`;
        }
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  }

  return result;
}

function mergeObjects(target: any, source: any): any {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      output[key] = mergeObjects(target[key], source[key]);
    } else if (!(key in target)) {
      output[key] = source[key];
    }
  }
  return output;
}

function updateTranslations() {
  const extractedKeys = extractKeys();
  const newStructure = unflattenObject(extractedKeys);

  if (!fs.existsSync(I18N_DIR)) {
    fs.mkdirSync(I18N_DIR, { recursive: true });
  }

  for (const lang of SUPPORTED_LANGS) {
    const langDir = path.join(I18N_DIR, lang);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    for (const topLevelKey of Object.keys(newStructure)) {
      const filePath = path.join(langDir, `${topLevelKey}.json`);
      let existingData = {};

      if (fs.existsSync(filePath)) {
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }

      const mergedData = mergeObjects(existingData, newStructure[topLevelKey]);
      fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2));
    }
  }
}

updateTranslations();
