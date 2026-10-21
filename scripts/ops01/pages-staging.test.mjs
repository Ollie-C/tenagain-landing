import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { configuration, preflight, receipt as providerReceipt } from './pages-staging.mjs';

const env = {
  CLOUDFLARE_API_TOKEN: 'synthetic-token-never-log',
  CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  CLOUDFLARE_PAGES_PROJECT: 'tenagain-landing',
  STAGING_PAGES_PROJECT_ID: 'b'.repeat(32),
  DEPLOY_SHA: 'c'.repeat(40),
  PAGES_DEPLOYMENT_ID: 'd'.repeat(32),
  PAGES_DEPLOYMENT_URL: 'https://1234abcd.tenagain-landing.pages.dev',
};
const proof = {
  source_sha: env.DEPLOY_SHA, source_tree: 'e'.repeat(40),
  expected_commit_dirty: false, generated_paths: [], artifact_sha256: 'f'.repeat(64), artifact_files: 3,
};
const receipt = (settings, fetcher, build = proof) => providerReceipt(settings, fetcher, async () => build);
const project = {
  id: env.STAGING_PAGES_PROJECT_ID, name: 'tenagain-landing',
  subdomain: 'tenagain-landing.pages.dev', production_branch: 'main', source: null,
  deployment_configs: { preview: { env_vars: { SECRET: { value: 'private-payload' } } } },
};
const deployment = {
  id: env.PAGES_DEPLOYMENT_ID, project_id: project.id, project_name: project.name,
  url: env.PAGES_DEPLOYMENT_URL, short_id: '1234abcd', environment: 'preview',
  deployment_trigger: { metadata: { branch: 'staging', commit_hash: env.DEPLOY_SHA, commit_dirty: false } },
  is_skipped: false, latest_stage: { name: 'deploy', status: 'success' },
  env_vars: { SECRET: { value: 'private-payload' } },
};
const copy = (value) => structuredClone(value);
function mock(p = project, d = deployment) {
  return async (url, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${env.CLOUDFLARE_API_TOKEN}`);
    assert.equal(new URL(url).origin, 'https://api.cloudflare.com');
    const base = `/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/tenagain-landing`;
    assert.ok([base, `${base}/deployments/${env.PAGES_DEPLOYMENT_ID}`].includes(new URL(url).pathname));
    return { ok: true, json: async () => ({ success: true, result: url.endsWith('/tenagain-landing') ? p : d }) };
  };
}

test('configuration rejects missing IDs, wrong project and abbreviated SHA before any request', () => {
  for (const [key, value] of [
    ['STAGING_PAGES_PROJECT_ID', ''], ['CLOUDFLARE_API_TOKEN', ''],
    ['CLOUDFLARE_ACCOUNT_ID', '../other'], ['STAGING_PAGES_PROJECT_ID', '../other'],
    ['CLOUDFLARE_PAGES_PROJECT', 'tenagain-frontend'], ['DEPLOY_SHA', 'abc1234'],
  ]) assert.throws(() => configuration({ ...env, [key]: value }));
});

test('preflight accepts only the pinned Direct Upload project with main as production', async () => {
  await preflight(env, mock());
  for (const [key, value] of [
    ['id', 'other'], ['name', 'other'], ['subdomain', 'other.pages.dev'],
    ['production_branch', 'staging'], ['production_branch', undefined],
    ['source', { type: 'github' }], ['source', {}],
  ]) await assert.rejects(preflight(env, mock({ ...project, [key]: value })));
});

test('HTTP, API, JSON, network and redirect failures withhold raw diagnostic values', async () => {
  const failures = [
    async () => ({ ok: false, json: async () => ({ secret: 'private-payload' }) }),
    async () => ({ ok: true, json: async () => ({ success: false, errors: ['private-payload'] }) }),
    async () => ({ ok: true, json: async () => { throw new Error('private-payload'); } }),
    async () => { throw new Error(`${env.CLOUDFLARE_API_TOKEN} private-payload`); },
  ];
  for (const fetcher of failures) await assert.rejects(preflight(env, fetcher),
    { message: 'Cloudflare identity read failed; raw response withheld' });
});

test('receipt pins exact deployment, preview, clean SHA, successful stage and immutable URL', async () => {
  const mutations = [
    d => { d.id = 'other'; }, d => { d.project_id = 'other'; },
    d => { d.project_name = 'tenagain-frontend'; }, d => { d.environment = 'production'; },
    d => { d.deployment_trigger.metadata.branch = 'main'; },
    d => { d.deployment_trigger.metadata.commit_hash = 'e'.repeat(40); },
    d => { d.deployment_trigger.metadata.commit_dirty = true; },
    d => { delete d.deployment_trigger; }, d => { d.is_skipped = true; },
    d => { d.latest_stage.status = 'active'; }, d => { d.latest_stage.name = 'build'; },
    d => { d.short_id = 'badc0ffe'; },
    d => { d.url = 'https://badc0ffe.tenagain-landing.pages.dev'; },
  ];
  for (const mutate of mutations) {
    const candidate = copy(deployment);
    mutate(candidate);
    await assert.rejects(receipt(env, mock(project, candidate)));
  }
});

test('receipt rejects alias URLs, foreign hosts and output/path injection', async () => {
  for (const url of [
    'https://staging.tenagain-landing.pages.dev', 'http://1234abcd.tenagain-landing.pages.dev',
    'https://1234abcd.tenagain-landing.pages.dev.evil.test',
    'https://1234abcd.tenagain-landing.pages.dev/api/release',
    'https://1234abcd.tenagain-landing.pages.dev?x=1',
    'https://user@1234abcd.tenagain-landing.pages.dev',
    `${env.PAGES_DEPLOYMENT_URL}\n::error::injected`,
  ]) await assert.rejects(receipt({ ...env, PAGES_DEPLOYMENT_URL: url }, mock()));
  await assert.rejects(receipt({ ...env, PAGES_DEPLOYMENT_ID: '../other' }, mock()));
});

test('receipt is an explicit allowlist and leaves protected hosted acceptance pending', async () => {
  const result = await receipt(env, mock());
  assert.equal(result.release_sha, env.DEPLOY_SHA);
  assert.equal(result.provider_deployment_status, 'success');
  assert.match(result.hosted_release_verification, /^pending exact hosted/);
  const serialized = JSON.stringify(result);
  for (const forbidden of [env.CLOUDFLARE_API_TOKEN, env.CLOUDFLARE_ACCOUNT_ID,
    'private-payload', 'env_vars', 'deployment_configs']) assert.ok(!serialized.includes(forbidden));
});

test('CLI fails closed with a fixed diagnostic without secrets or network access', () => {
  const run = spawnSync(process.execPath, ['scripts/ops01/pages-staging.mjs', 'preflight'], {
    env: { ...env, CLOUDFLARE_PAGES_PROJECT: 'wrong-project' }, encoding: 'utf8',
  });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /^::error::Pages staging identity check failed\./);
  assert.match(run.stderr, /Unexpected staging project/);
  assert.ok(!run.stderr.includes(env.CLOUDFLARE_API_TOKEN));
});

test('receipt command writes only sanitized JSON and refuses to overwrite evidence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pages-staging-test-'));
  const path = join(directory, 'pages-staging-receipt.json');
  const code = `
    import { main } from ${JSON.stringify(import.meta.resolve('./pages-staging.mjs'))};
    const { env, project, deployment } = JSON.parse(process.env.FIXTURE);
    main('receipt', env, async url => ({ ok: true, json: async () => ({
      success: true, result: url.endsWith('/tenagain-landing') ? project : deployment,
    }) }), async () => JSON.parse(process.env.FIXTURE).proof).catch(() => { process.exitCode = 1; });
  `;
  const run = () => spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: directory, env: { FIXTURE: JSON.stringify({ env, project, deployment, proof }) },
    encoding: 'utf8', timeout: 5000,
  });
  try {
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const saved = readFileSync(path, 'utf8');
    assert.equal(JSON.parse(saved).release_sha, env.DEPLOY_SHA);
    for (const forbidden of [env.CLOUDFLARE_API_TOKEN, env.CLOUDFLARE_ACCOUNT_ID, 'private-payload']) {
      assert.ok(!`${saved}${first.stdout}${first.stderr}`.includes(forbidden));
    }
    assert.equal(run().status, 1);
    assert.equal(readFileSync(path, 'utf8'), saved);
  } finally {
    try { unlinkSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    rmdirSync(directory);
  }
});

test('dirty provider metadata requires matching verified generated-only provenance and is retained truthfully', async () => {
  const dirty = copy(deployment);
  dirty.deployment_trigger.metadata.commit_dirty = true;
  await assert.rejects(receipt(env, mock(project, dirty)), /dirty flag/);
  const generated = { ...proof, expected_commit_dirty: true, generated_paths: ['dist/api/release'] };
  const result = await receipt(env, mock(project, dirty), generated);
  assert.equal(result.provider_commit_dirty, true);
  assert.equal(result.generated_changes, 1);
  assert.equal(result.source_started_clean, true);
  assert.equal(result.artifact_sha256, generated.artifact_sha256);
  await assert.rejects(receipt(env, mock(), generated), /dirty flag/);
  delete dirty.deployment_trigger.metadata.commit_dirty;
  await assert.rejects(receipt(env, mock(project, dirty), generated), /dirty flag/);
  await assert.rejects(providerReceipt(env, mock(project, deployment), async () => {
    throw new Error('No build provenance');
  }), /No build provenance/);
});
