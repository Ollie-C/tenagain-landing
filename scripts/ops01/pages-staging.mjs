import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { beginBuild, finishBuild, ProvenanceError, verifyBuildProvenance } from './build-provenance.mjs';

const projectName = 'tenagain-landing';
const subdomain = `${projectName}.pages.dev`;
const opaqueId = /^[A-Za-z0-9-]{16,64}$/;
class StagingError extends Error {}
const check = (condition, message) => {
  if (!condition) throw new StagingError(message);
};

export function configuration(env) {
  for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_PAGES_PROJECT', 'STAGING_PAGES_PROJECT_ID', 'DEPLOY_SHA']) {
    check(typeof env[key] === 'string' && env[key].trim().length > 0, `Missing ${key}`);
  }
  check(/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID), 'Invalid account identifier');
  check(env.CLOUDFLARE_PAGES_PROJECT === projectName, 'Unexpected staging project');
  check(opaqueId.test(env.STAGING_PAGES_PROJECT_ID), 'Invalid project identifier');
  check(/^[a-f0-9]{40}$/.test(env.DEPLOY_SHA), 'A full tested commit SHA is required');
  return {
    token: env.CLOUDFLARE_API_TOKEN,
    account: env.CLOUDFLARE_ACCOUNT_ID,
    projectId: env.STAGING_PAGES_PROJECT_ID,
    sha: env.DEPLOY_SHA,
  };
}

async function api(config, suffix, fetcher) {
  // Raw provider payloads can contain env values. Never persist them or include
  // provider error bodies, request URLs or exception text in diagnostics.
  try {
    const response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${config.account}/pages/projects/${projectName}${suffix}`,
      {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${config.token}` },
      },
    );
    check(response.ok, 'HTTP failure');
    const body = await response.json();
    check(body.success === true && body.result && typeof body.result === 'object', 'API failure');
    return body.result;
  } catch {
    throw new StagingError('Cloudflare identity read failed; raw response withheld');
  }
}

export async function preflight(env, fetcher = fetch) {
  const config = configuration(env);
  const project = await api(config, '', fetcher);
  check(project.id === config.projectId && project.name === projectName
    && project.subdomain === subdomain, 'Project identity mismatch');
  check(project.production_branch === 'main', 'Production branch must be main');
  check(project.source == null, 'Expected the reviewed Direct Upload project');
  return config;
}

function deploymentUrl(value) {
  // Only an immutable Pages deployment host, never a mutable branch alias.
  check(typeof value === 'string'
    && /^https:\/\/[a-f0-9]{8}\.tenagain-landing\.pages\.dev\/?$/.test(value),
  'Unexpected deployment URL');
  return new URL(value).origin;
}

export async function receipt(env, fetcher = fetch, verifyProvenance = verifyBuildProvenance) {
  const config = await preflight(env, fetcher);
  const build = await verifyProvenance(env);
  check(opaqueId.test(env.PAGES_DEPLOYMENT_ID ?? ''), 'Missing or invalid deployment identifier');
  const url = deploymentUrl(env.PAGES_DEPLOYMENT_URL);
  const deployment = await api(config,
    `/deployments/${encodeURIComponent(env.PAGES_DEPLOYMENT_ID)}`, fetcher);
  check(deployment.id === env.PAGES_DEPLOYMENT_ID
    && deployment.project_id === config.projectId
    && deployment.project_name === projectName, 'Deployment identity mismatch');
  check(deploymentUrl(deployment.url) === url, 'Deployment URL mismatch');
  check(deployment.short_id === new URL(url).hostname.split('.')[0], 'Deployment host mismatch');
  check(deployment.environment === 'preview', 'Deployment must be a preview');
  const metadata = deployment.deployment_trigger?.metadata;
  check(metadata?.branch === 'staging' && metadata.commit_hash === config.sha,
    'Deployment branch or tested SHA mismatch');
  check(typeof metadata.commit_dirty === 'boolean'
    && metadata.commit_dirty === build.expected_commit_dirty,
  'Deployment dirty flag differs from verified build provenance');
  check(deployment.is_skipped === false && deployment.latest_stage?.name === 'deploy'
    && deployment.latest_stage.status === 'success', 'Deployment is not successfully deployed');
  return {
    schema_version: 1,
    checked_at: new Date().toISOString(),
    project: projectName,
    project_id: config.projectId,
    account_project_agreement: 'verified by CI credential GET',
    production_branch: 'main',
    git_source: 'absent',
    deployment_id: deployment.id,
    deployment_url: url,
    environment: 'preview',
    branch: 'staging',
    release_sha: config.sha,
    source_tree: build.source_tree,
    source_started_clean: true,
    generated_changes: build.generated_paths.length,
    provider_commit_dirty: metadata.commit_dirty,
    artifact_sha256: build.artifact_sha256,
    artifact_files: build.artifact_files,
    provider_deployment_status: 'success',
    hosted_release_verification: 'pending exact hosted /api/release and Access behavior checks',
  };
}

export async function main(mode, env = process.env, fetcher = fetch, verifyProvenance = verifyBuildProvenance) {
  if (mode === 'preflight') {
    await preflight(env, fetcher);
    console.log('Staging project identity and Direct Upload controls verified.');
  } else if (mode === 'source-before-build') {
    await beginBuild(env);
    console.log('Exact source checkout verified clean before install/build.');
  } else if (mode === 'source-after-build') {
    await finishBuild(env);
    console.log('Generated-only changes and exact built release recorded with artifact hash.');
  } else if (mode === 'receipt') {
    const result = await receipt(env, fetcher, verifyProvenance);
    await writeFile('pages-staging-receipt.json', `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    console.log('Sanitized provider receipt saved; exact hosted release and Access checks remain pending.');
  } else {
    throw new Error('Unknown staging verification mode');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]).catch(error => {
    // Even filesystem errors may contain unreviewed paths. Keep CLI failures fixed.
    const reason = error instanceof StagingError || error instanceof ProvenanceError
      ? error.message : 'Raw diagnostics withheld.';
    console.error(`::error::Pages staging identity check failed. ${reason}`);
    process.exitCode = 1;
  });
}
