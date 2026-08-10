const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { PROJECT_ROOT } = require('./project-root');
const { loadSyncFile, SCHEMA_VERSION } = require('./sync-utils');

const SYNC_FILE = path.join(PROJECT_ROOT, '.canvas-sync.json');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');

function prompt(rl, question, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function init() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('[init] Canvas LMS setup');
  console.log(
    '[init] This will create .env and .canvas-sync.json in the project root.\n',
  );

  // Read existing .env values if present
  let existingUrl = '';
  let existingToken = '';
  let existingCourseId = '';
  if (fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const urlMatch = envContent.match(/^CANVAS_API_URL=(.*)$/m);
    const tokenMatch = envContent.match(/^CANVAS_API_TOKEN=(.*)$/m);
    const courseMatch = envContent.match(/^CANVAS_COURSE_ID=(.*)$/m);
    if (urlMatch) existingUrl = urlMatch[1].trim();
    if (tokenMatch) existingToken = tokenMatch[1].trim();
    if (courseMatch) existingCourseId = courseMatch[1].trim();
  }

  const canvasUrl = await prompt(
    rl,
    'Canvas URL (e.g. https://school.instructure.com)',
    existingUrl,
  );
  const apiToken = await prompt(rl, 'Canvas API token', existingToken);
  const courseId = await prompt(rl, 'Canvas course ID', existingCourseId);

  rl.close();

  if (!canvasUrl || !apiToken || !courseId) {
    console.error('[init] Error: All three values are required.');
    process.exit(1);
  }

  // Normalize the URL: strip trailing slashes and any /api/v1 suffix
  // (API paths already include /api/v1, so CANVAS_API_URL should be the base URL only)
  const apiUrl = canvasUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');

  // Write .env file
  const envContent = [
    `CANVAS_API_URL=${apiUrl}`,
    `CANVAS_API_TOKEN=${apiToken}`,
    `CANVAS_COURSE_ID=${courseId}`,
    '',
  ].join('\n');

  fs.writeFileSync(ENV_FILE, envContent, 'utf8');
  console.log(`[init] Wrote ${ENV_FILE}`);

  // Create .canvas-sync.json
  const syncData = {
    schema_version: SCHEMA_VERSION,
    canvas_base_url: apiUrl,
    course_id: Number(courseId),
    modules: {},
    last_sync: null,
  };

  // Preserve existing module mappings if the file already exists
  const existing = loadSyncFile({ allowNull: true });
  if (existing && existing.modules) {
    syncData.modules = existing.modules;
  }
  if (existing && existing.files) {
    syncData.files = existing.files;
  }
  if (existing && existing.icons) {
    syncData.icons = existing.icons;
  }

  fs.writeFileSync(SYNC_FILE, JSON.stringify(syncData, null, 2) + '\n', 'utf8');
  console.log(`[init] Wrote ${SYNC_FILE}`);

  console.log(
    '\n[init] ⚠ Security reminder: .env contains your Canvas API token.',
  );
  console.log(
    '[init]   Make sure .env is listed in .gitignore and never committed to version control.',
  );

  console.log('\n[init] Setup complete. You can now run:');
  console.log('  npx course push   - push local content to Canvas');
  console.log('  npx course pull   - pull Canvas content locally');
  console.log('  npx course status - compare local vs Canvas state');
}

module.exports = init;
