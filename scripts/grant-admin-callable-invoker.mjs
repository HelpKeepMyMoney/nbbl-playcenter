/**
 * Gen2 Firebase callables sit on Cloud Run. Browsers send an unauthenticated OPTIONS
 * preflight before POST; if Cloud Run does not grant roles/run.invoker to allUsers,
 * Google returns 403 with no CORS headers — Chrome surfaces that as a CORS failure.
 *
 * Requires: gcloud CLI, logged in, permission run.services.setIamPolicy on the project.
 * Project: .firebaserc default or GCLOUD_PROJECT. Region: FUNCTIONS_REGION or us-central1.
 */
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function readDefaultProject() {
  const rcPath = path.join(root, '.firebaserc');
  if (!fs.existsSync(rcPath)) {
    throw new Error(`Missing ${rcPath}`);
  }
  const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
  return process.env.GCLOUD_PROJECT || rc.projects?.default;
}

const region = process.env.FUNCTIONS_REGION || 'us-central1';
const project = readDefaultProject();
if (!project) {
  throw new Error('No Firebase project id (GCLOUD_PROJECT or .firebaserc default).');
}

/** Substrings of Cloud Run service names for our admin callables (ids are lowercase). */
const SERVICE_HINTS = ['setuseradminrole', 'deleteuseraccount'];

function listRunServices() {
  const out = execSync(
    `gcloud run services list --project=${project} --region=${region} --format=value(metadata.name)`,
    {encoding: 'utf8'},
  );
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function grant(svc) {
  console.log(`Granting roles/run.invoker to allUsers on Cloud Run service "${svc}"...`);
  execSync(
    `gcloud run services add-iam-policy-binding "${svc}" --project=${project} --region=${region} --member=allUsers --role=roles/run.invoker`,
    {stdio: 'inherit'},
  );
}

const names = listRunServices();
const targets = names.filter((name) => {
  const l = name.toLowerCase();
  return SERVICE_HINTS.some((h) => l.includes(h));
});

if (targets.length === 0) {
  console.error(`No Cloud Run services in ${region} (project ${project}) matched: ${SERVICE_HINTS.join(', ')}`);
  console.error(names.length ? `Found: ${names.join(', ')}` : 'No services returned.');
  console.error('Open GCP Console → Cloud Run, find the services behind setUserAdminRole / deleteUserAccount,');
  console.error('Security → Allow public access (or add allUsers as Cloud Run Invoker).');
  process.exit(1);
}

for (const t of targets) {
  grant(t);
}
console.log('Done. Retry the admin Role action from the browser.');
