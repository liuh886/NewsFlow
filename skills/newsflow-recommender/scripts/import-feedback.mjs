import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const input = args.get('input');
const apply = args.has('apply');
if (!input) throw new Error('Missing --input=<newsflow-feedback.json>');

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const policy = await readJson('config/recommendation-policy.json');
const existing = await readJson('content/feedback/events.json');
const exported = await readJson(String(input));
const problems = [];
const allowedActions = new Set(Object.keys(policy.feedback.allowed_actions || {}));
const allowedFields = new Set(['event_id', 'occurred_at', 'signal_id', 'action', 'surface', 'channel_id', 'storyline_ids', 'tags', 'source', 'target_event_id']);

if (exported.schema_version !== '1.0') problems.push('unsupported feedback export schema_version');
if (exported.app_id !== 'newsflow-pwa') problems.push('feedback export app_id must be newsflow-pwa');
if (!Array.isArray(exported.events)) problems.push('events must be an array');
if (!Array.isArray(existing)) problems.push('content/feedback/events.json must be an array');

const seen = new Set(existing.map((event) => event.event_id));
const accepted = [];
const duplicates = [];
const rejected = [];
for (const [index, event] of (exported.events || []).entries()) {
  const reasons = [];
  for (const field of ['event_id', 'occurred_at', 'signal_id', 'action', 'surface']) {
    if (typeof event?.[field] !== 'string' || !event[field].trim()) reasons.push(`missing ${field}`);
  }
  const date = new Date(event?.occurred_at);
  if (Number.isNaN(date.getTime())) reasons.push('invalid occurred_at');
  if (date.getTime() > Date.now() + 300_000) reasons.push('occurred_at must not be in the future');
  if (!allowedActions.has(event?.action)) reasons.push('unsupported action');
  const unexpected = Object.keys(event || {}).filter((field) => !allowedFields.has(field));
  if (unexpected.length) reasons.push(`unexpected fields: ${unexpected.join(', ')}`);
  for (const field of ['storyline_ids', 'tags']) {
    if (event?.[field] !== undefined && (!Array.isArray(event[field]) || event[field].some((value) => typeof value !== 'string'))) {
      reasons.push(`${field} must be an array of strings`);
    }
  }
  if (event?.target_event_id !== undefined && (typeof event.target_event_id !== 'string' || !event.target_event_id.trim())) {
    reasons.push('target_event_id must be a non-empty string');
  }
  if (seen.has(event?.event_id)) {
    duplicates.push(event.event_id);
  } else if (reasons.length) {
    rejected.push({ index, event_id: event?.event_id || null, reasons });
  } else {
    seen.add(event.event_id);
    accepted.push({
      event_id: event.event_id.trim(),
      occurred_at: date.toISOString(),
      signal_id: event.signal_id.trim(),
      action: event.action,
      surface: event.surface.trim(),
      channel_id: String(event.channel_id || '').trim(),
      storyline_ids: [...new Set(event.storyline_ids || [])],
      tags: [...new Set(event.tags || [])],
      source: String(event.source || '').trim(),
      ...(event.target_event_id ? { target_event_id: event.target_event_id.trim() } : {})
    });
  }
}

if (problems.length) throw new Error(`Feedback export failed:\n- ${problems.join('\n- ')}`);
const report = {
  schema_version: '1.0',
  applied: apply,
  existing_count: existing.length,
  accepted_count: accepted.length,
  duplicate_count: duplicates.length,
  rejected_count: rejected.length,
  duplicates,
  rejected
};
if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}
if (rejected.length) throw new Error('Refusing to apply a feedback export containing rejected events');
const next = [...existing, ...accepted].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at) || a.event_id.localeCompare(b.event_id));
await writeFile(resolve(root, 'content/feedback/events.json'), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ...report, total_count: next.length }, null, 2));
