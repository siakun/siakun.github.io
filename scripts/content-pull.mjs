/**
 * Downloads public Markdown content for local development.
 *
 * CI checks out the same directory in deploy.yml, so this script exits before
 * checking local tools whenever CI is set.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const REPOSITORY = 'siakun-private/notes';
const CONTENT_ROOT = join(PROJECT_DIR, '.content');
const CONTENT_PREFIX = 'siakun.github.io/public';
const TARGET_DIR = join(CONTENT_ROOT, ...CONTENT_PREFIX.split('/'));

if (process.env.CI && process.env.CI !== 'false') {
  console.log('CI 환경에서는 로컬 콘텐츠 pull을 건너뜁니다.');
  process.exit(0);
}

function run(command, args, stdio = 'inherit') {
  return spawnSync(command, args, {
    cwd: PROJECT_DIR,
    encoding: 'utf-8',
    stdio,
  });
}

function assertGitHubCli() {
  const result = run('gh', ['--version'], 'ignore');
  if (result.error || result.status !== 0) {
    throw new Error(
      'GitHub CLI(gh)를 찾을 수 없습니다. https://cli.github.com/ 에서 설치한 뒤 `gh auth login --hostname github.com`을 실행해 주세요.',
    );
  }
}

function assertGitHubAuth() {
  const result = run(
    'gh',
    ['auth', 'status', '--hostname', 'github.com'],
    'ignore',
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      'GitHub CLI 인증이 필요합니다. `gh auth login --hostname github.com`을 실행하고 siakun-private/notes 읽기 권한이 있는 계정으로 로그인해 주세요.',
    );
  }
}

let temporaryRoot;
let stagingDir;

try {
  assertGitHubCli();
  assertGitHubAuth();

  temporaryRoot = mkdtempSync(join(tmpdir(), 'siakun-content-'));
  const checkoutDir = join(temporaryRoot, 'notes');

  const cloneResult = run('gh', [
    'repo',
    'clone',
    REPOSITORY,
    checkoutDir,
    '--',
    '--depth=1',
    '--filter=blob:none',
    '--sparse',
  ]);
  if (cloneResult.error || cloneResult.status !== 0) {
    throw new Error(
      `콘텐츠 저장소를 받지 못했습니다. \`gh repo view ${REPOSITORY}\`로 저장소 읽기 권한을 확인해 주세요.`,
    );
  }

  const sparseCheckoutResult = run('git', [
    '-C',
    checkoutDir,
    'sparse-checkout',
    'set',
    CONTENT_PREFIX,
  ]);
  if (sparseCheckoutResult.error || sparseCheckoutResult.status !== 0) {
    throw new Error(
      `콘텐츠 저장소의 ${CONTENT_PREFIX}/ 디렉터리를 체크아웃하지 못했습니다.`,
    );
  }

  const sourceDir = join(checkoutDir, ...CONTENT_PREFIX.split('/'));
  if (!existsSync(sourceDir)) {
    throw new Error(`${REPOSITORY} 저장소에 ${CONTENT_PREFIX}/ 디렉터리가 없습니다.`);
  }

  // TARGET_DIR 이 중첩 경로이므로 상위까지 만들어야 rename 이 성공한다.
  mkdirSync(dirname(TARGET_DIR), { recursive: true });
  stagingDir = join(CONTENT_ROOT, `.public-${process.pid}-${Date.now()}`);
  cpSync(sourceDir, stagingDir, { recursive: true });

  // Replace only the public checkout so future sibling content stays intact.
  rmSync(TARGET_DIR, { recursive: true, force: true });
  renameSync(stagingDir, TARGET_DIR);
  stagingDir = undefined;

  console.log(`콘텐츠를 ${TARGET_DIR}에 받았습니다.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (stagingDir) rmSync(stagingDir, { recursive: true, force: true });
  if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
}
