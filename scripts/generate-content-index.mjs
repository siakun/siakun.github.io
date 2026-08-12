/**
 * Scans site components and externally supplied Markdown, then generates tab files.
 *
 * Generated files:
 * - generated/tab-defs.ts: tab metadata (ID, label, icon, description)
 * - generated/tab-[tabId].ts: content for each tab (individual bundle)
 *
 * Filename rule: <order>. <id>.<md|tsx>
 * - src/content/*.tsx -> { type: 'component', component: ComponentType }
 * - external/*.md    -> { type: 'markdown', content: string }
 * - home             -> special tab (icon: home, root path)
 * - about            -> special tab (icon: about, placed last by its order)
 * - the first `# heading` in a Markdown file becomes its tab label
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const COMPONENT_CONTENT_DIR = join(PROJECT_DIR, 'src', 'content');
const EXTERNAL_CONTENT_DIR = resolve(
  PROJECT_DIR,
  process.env.EXTERNAL_CONTENT_DIR || '.content/public',
);
const GENERATED_DIR = join(PROJECT_DIR, 'src', 'generated');

const FILE_PATTERN = /^(\d+)\.\s+(.+)\.(md|tsx)$/;

function scanContent(directory, expectedExtension) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const match = entry.name.match(FILE_PATTERN);
      if (!match || match[3] !== expectedExtension) return null;

      const [, order, id, extension] = match;
      return {
        filepath: join(directory, entry.name),
        order: Number.parseInt(order, 10),
        id,
        ext: extension,
      };
    })
    .filter(Boolean);
}

// The directory boundary is the publication boundary. Local Markdown and
// external TSX files are intentionally ignored even when their names match.
const files = [
  ...scanContent(COMPONENT_CONTENT_DIR, 'tsx'),
  ...scanContent(EXTERNAL_CONTENT_DIR, 'md'),
].sort((a, b) => a.order - b.order);

function displayPath(filepath) {
  const projectRelativePath = relative(PROJECT_DIR, filepath);
  const isOutsideProject =
    projectRelativePath === '..' ||
    projectRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(projectRelativePath);

  return (isOutsideProject ? filepath : projectRelativePath).replace(
    /\\/g,
    '/',
  );
}

function findConflicts(property, label) {
  const values = new Map();

  for (const file of files) {
    const value = file[property];
    const matches = values.get(value) ?? [];
    matches.push(file);
    values.set(value, matches);
  }

  return [...values.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(
      ([value, matches]) =>
        `  ${label} "${value}":\n${matches
          .map((file) => `    - ${displayPath(file.filepath)}`)
          .join('\n')}`,
    );
}

// Validate the merged model before writing anything so a conflict cannot
// leave a partially regenerated index behind.
const conflicts = [
  ...findConflicts('order', 'order'),
  ...findConflicts('id', 'id'),
];

if (conflicts.length > 0) {
  console.error(
    [
      'Content conflicts detected. Every order and id must be unique:',
      ...conflicts,
    ].join('\n'),
  );
  process.exit(1);
}

function toSingleQuotedString(value) {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}'`;
}

function toImportPath(filepath) {
  const generatedRelativePath = relative(GENERATED_DIR, filepath).replace(
    /\\/g,
    '/',
  );
  return generatedRelativePath.startsWith('.')
    ? generatedRelativePath
    : `./${generatedRelativePath}`;
}

// Extract the first # heading from a Markdown file.
function extractHeading(filepath) {
  const content = readFileSync(filepath, 'utf-8');
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

// Extract the first paragraph from a Markdown file as its description.
function extractDescription(filepath) {
  const content = readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headings, blank lines, and HTML tags.
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('<'))
      continue;
    // Use the first regular text line, limited to 160 characters.
    return trimmed.slice(0, 160);
  }
  return '';
}

// === Generate tab-defs.ts ===
const tabDefEntries = files.map(({ id, ext, filepath }) => {
  let label = id;
  let description = '';
  if (ext === 'md') {
    const heading = extractHeading(filepath);
    if (heading) label = heading;
    description = extractDescription(filepath);
  }

  let icon = 'null';
  if (id === 'home') icon = "'home'";
  else if (id === 'about') icon = "'about'";

  return { id, label, icon, description };
});

const tabDefsOutput = `// This file is auto-generated by scripts/generate-content-index.mjs
// Do not edit manually.

export interface TabDefMeta {
  readonly id: string;
  readonly label: string;
  readonly icon: 'home' | 'about' | null;
  readonly description: string;
}

export const ALL_TAB_METAS: TabDefMeta[] = [
${tabDefEntries.map((tab) => `  { id: ${toSingleQuotedString(tab.id)}, label: ${toSingleQuotedString(tab.label)}, icon: ${tab.icon}, description: ${toSingleQuotedString(tab.description)} },`).join('\n')}
];
`;

mkdirSync(GENERATED_DIR, { recursive: true });

const expectedGeneratedFiles = new Set([
  'tab-defs.ts',
  'tab-content-map.ts',
  ...files.map(({ id }) => `tab-${id}.ts`),
]);

// A missing or renamed source must remove its old generated module as well.
for (const entry of readdirSync(GENERATED_DIR, { withFileTypes: true })) {
  if (
    entry.isFile() &&
    /^tab-.+\.ts$/.test(entry.name) &&
    !expectedGeneratedFiles.has(entry.name)
  ) {
    unlinkSync(join(GENERATED_DIR, entry.name));
  }
}

// === Generate individual tab content files ===
for (const { filepath, id, ext } of files) {
  const importPath = toImportPath(filepath);
  let content;

  if (ext === 'tsx') {
    const varName = id.charAt(0).toUpperCase() + id.slice(1) + 'Content';
    content = `// This file is auto-generated by scripts/generate-content-index.mjs
// Do not edit manually.

import type { ComponentType } from 'react';

import ${varName} from ${toSingleQuotedString(importPath.replace(/\.tsx$/, ''))};

export type TabContent =
  | { type: 'markdown'; content: string }
  | { type: 'component'; component: ComponentType<{ accentColor: string }> };

const tabContent: TabContent = { type: 'component', component: ${varName} };
export default tabContent;
`;
  } else {
    const varName = id + 'Md';
    content = `// This file is auto-generated by scripts/generate-content-index.mjs
// Do not edit manually.

import type { ComponentType } from 'react';

import ${varName} from ${toSingleQuotedString(importPath)};

export type TabContent =
  | { type: 'markdown'; content: string }
  | { type: 'component'; component: ComponentType<{ accentColor: string }> };

const tabContent: TabContent = { type: 'markdown', content: ${varName} };
export default tabContent;
`;
  }

  writeFileSync(join(GENERATED_DIR, `tab-${id}.ts`), content, 'utf-8');
}

// === Generate tab-content-map.ts (excluding home) ===
const contentMapFiles = files.filter(({ id }) => id !== 'home');
const contentMapImports = contentMapFiles
  .map(
    ({ id }) =>
      `import tab${id.charAt(0).toUpperCase() + id.slice(1)} from './tab-${id}';`,
  )
  .join('\n');
const contentMapEntries = contentMapFiles
  .map(
    ({ id }) =>
      `  ${toSingleQuotedString(id)}: tab${id.charAt(0).toUpperCase() + id.slice(1)},`,
  )
  .join('\n');

const contentMapOutput = `// This file is auto-generated by scripts/generate-content-index.mjs
// Do not edit manually.

import type { TabContent } from './tab-home';

${contentMapImports}

export type { TabContent };

export const TAB_CONTENT_MAP: Record<string, TabContent> = {
${contentMapEntries}
};
`;

writeFileSync(join(GENERATED_DIR, 'tab-defs.ts'), tabDefsOutput, 'utf-8');
writeFileSync(
  join(GENERATED_DIR, 'tab-content-map.ts'),
  contentMapOutput,
  'utf-8',
);

console.log('Generated files:');
console.log(`  ${join(GENERATED_DIR, 'tab-defs.ts')}`);
console.log(`  ${join(GENERATED_DIR, 'tab-content-map.ts')}`);
for (const { id } of files) {
  console.log(`  ${join(GENERATED_DIR, `tab-${id}.ts`)}`);
}
console.log(`  Tabs: ${files.map((file) => file.id).join(', ')}`);
