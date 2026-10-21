import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

export class ProvenanceError extends Error {}
const check = (value, message) => { if (!value) throw new ProvenanceError(message); };
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const generated = path => path.startsWith('.astro/') || path.startsWith('dist/');

function context(env) {
  check(/^[a-f0-9]{40}$/.test(env.DEPLOY_SHA ?? ''), 'Invalid provenance source SHA');
  const root = git('rev-parse', '--show-toplevel').trim();
  check(resolve(process.cwd()) === resolve(root), 'Run provenance checks at repository root');
  check(git('rev-parse', 'HEAD').trim() === env.DEPLOY_SHA, 'Checkout differs from tested SHA');
  const file = env.PAGES_BUILD_PROVENANCE;
  check(typeof file === 'string' && isAbsolute(file), 'Absolute provenance path required');
  const outside = relative(root, file);
  check(outside.startsWith('../') || isAbsolute(outside), 'Provenance must be outside checkout');
  return { file, sha: env.DEPLOY_SHA, tree: git('rev-parse', 'HEAD^{tree}').trim() };
}

function changes() {
  // Disable rename detection so a source file moved into dist still exposes
  // its disallowed source deletion. Include staged and unstaged changes.
  const tracked = git('diff', '--no-renames', '--name-only', '-z', 'HEAD').split('\0');
  const untracked = git('ls-files', '--others', '--exclude-standard', '-z').split('\0');
  return [...new Set([...tracked, ...untracked].filter(Boolean))].sort();
}

async function artifact() {
  const entries = [];
  async function walk(directory) {
    const info = await lstat(directory);
    check(!info.isSymbolicLink(), 'Build output cannot contain symlinks');
    check(info.isDirectory(), 'Build output must be a directory');
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const stat = await lstat(path);
      check(!stat.isSymbolicLink(), 'Build output cannot contain symlinks');
      if (stat.isDirectory()) await walk(path);
      else {
        check(stat.isFile(), 'Build output contains unsupported file type');
        entries.push([path, createHash('sha256').update(await readFile(path)).digest('hex')]);
      }
    }
  }
  await walk('dist');
  check(entries.length > 0, 'Build output is empty');
  return { sha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'), files: entries.length };
}

async function release(sha) {
  const body = JSON.parse(await readFile('dist/api/release', 'utf8'));
  check(body.status === 'ok' && body.release === sha, 'Build release differs from tested SHA');
}

async function readProof(ctx) {
  const proof = JSON.parse(await readFile(ctx.file, 'utf8'));
  check(proof.schema_version === 1 && proof.source_sha === ctx.sha
    && proof.source_tree === ctx.tree && proof.started_clean === true,
  'Provenance source identity mismatch');
  return proof;
}

export async function beginBuild(env) {
  const ctx = context(env);
  check(changes().length === 0, 'Build must start from a clean checkout');
  const proof = { schema_version: 1, source_sha: ctx.sha, source_tree: ctx.tree,
    started_clean: true, phase: 'before-build' };
  await writeFile(ctx.file, `${JSON.stringify(proof, null, 2)}\n`, { flag: 'wx' });
}

export async function finishBuild(env) {
  const ctx = context(env);
  const proof = await readProof(ctx);
  check(proof.phase === 'before-build', 'Build provenance already completed');
  const paths = changes();
  check(paths.every(generated), 'Build changed files outside generated directories');
  await release(ctx.sha);
  const built = await artifact();
  const completed = { ...proof, phase: 'after-build', generated_paths: paths,
    expected_commit_dirty: paths.length > 0, artifact_sha256: built.sha256,
    artifact_files: built.files };
  await writeFile(ctx.file, `${JSON.stringify(completed, null, 2)}\n`);
  return completed;
}

export async function verifyBuildProvenance(env) {
  const ctx = context(env);
  const proof = await readProof(ctx);
  check(proof.phase === 'after-build' && Array.isArray(proof.generated_paths)
    && proof.generated_paths.every(path => typeof path === 'string' && generated(path))
    && proof.expected_commit_dirty === (proof.generated_paths.length > 0),
  'Incomplete or inconsistent build provenance');
  // Recheck source and exact dist bytes after Wrangler. Its own untracked cache
  // is not an application input or part of dist; other new source is rejected.
  check(changes().every(path => generated(path) || path.startsWith('.wrangler/')),
    'Source changed after the build');
  await release(ctx.sha);
  const built = await artifact();
  check(built.sha256 === proof.artifact_sha256 && built.files === proof.artifact_files,
    'Build output changed after provenance capture');
  return proof;
}
