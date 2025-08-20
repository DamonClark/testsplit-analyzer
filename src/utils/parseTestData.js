// Minimal client-side parsing for CSV and JSON test timing data
// Expected shapes:
// - CSV headers: name,file,spec,title | duration,time,seconds,ms | group,runner,shard,ci_node_index (any combo)
// - JSON: [{ name, duration } ...] or { tests: [...] } with keys name/file/spec/title and duration/time/seconds/ms

function toMinutes(value, unitHint) {
  const num = Number(value);
  if (!isFinite(num)) return 0;
  if (unitHint === 'ms' || /ms/i.test(unitHint || '')) return num / 60000;
  if (unitHint === 's' || /sec/i.test(unitHint || '')) return num / 60;
  // assume minutes by default
  return num;
}

function mapHeaderIndexes(headers) {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const find = (candidates) => lower.findIndex((h) => candidates.includes(h));
  const nameIdx = find(['name', 'test', 'file', 'spec', 'title', 'path']);
  const durationIdx = find(['duration', 'time', 'seconds', 'secs', 's', 'ms', 'milliseconds']);
  const groupIdx = find(['group', 'runner', 'shard', 'ci_node_index', 'ci_node']);
  return { nameIdx, durationIdx, groupIdx, durationHeader: lower[durationIdx] };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',');
  const { nameIdx, durationIdx, groupIdx, durationHeader } = mapHeaderIndexes(headers);
  if (nameIdx < 0 || durationIdx < 0) {
    throw new Error('CSV must include columns for name and duration (e.g., name,duration).');
  }

  const tests = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',');
    const name = (cols[nameIdx] || '').trim();
    const durationRaw = (cols[durationIdx] || '').trim();
    const group = groupIdx >= 0 ? (cols[groupIdx] || '').trim() : undefined;
    if (!name) continue;
    const durationMinutes = toMinutes(durationRaw, durationHeader);
    if (!isFinite(durationMinutes) || durationMinutes <= 0) continue;
    tests.push({ name, durationMinutes, group });
  }
  return tests;
}

function parseJson(text) {
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : Array.isArray(data?.tests) ? data.tests : null;
  if (!items) throw new Error('JSON must be an array of tests or { tests: [...] }');
  const tests = [];
  for (const item of items) {
    const name = item.name || item.test || item.file || item.spec || item.title || item.path;
    const group = item.group || item.runner || item.shard || item.ci_node_index || item.ci_node;
    const durationVal = item.duration ?? item.time ?? item.seconds ?? item.ms ?? item.milliseconds;
    const unitHint = 'duration' in item ? 'm' : 'time' in item ? 'm' : 'seconds' in item ? 's' : 'ms' in item ? 'ms' : 'm';
    if (!name || durationVal == null) continue;
    const durationMinutes = toMinutes(durationVal, unitHint);
    if (!isFinite(durationMinutes) || durationMinutes <= 0) continue;
    tests.push({ name, durationMinutes, group });
  }
  return tests;
}

export async function parseFileToTests(file) {
  const content = await file.text();
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'csv') return parseCsv(content);
  if (ext === 'json') return parseJson(content);
  // Try to sniff content type
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return parseJson(content);
  if (trimmed.includes(',')) return parseCsv(content);
  throw new Error('Unsupported file type. Please upload CSV or JSON with test durations.');
}

export function generateTemplateCsv() {
  const header = 'name,duration,group\n';
  const rows = [
    'auth/login.spec.js,4.2,1',
    'payments/checkout.spec.js,3.8,2',
    'admin/dashboard.spec.js,3.5,2',
    'profile/update.spec.js,2.9,1',
  ];
  return header + rows.join('\n');
}

export function generateTemplateJson() {
  const payload = {
    tests: [
      { name: 'auth/login.spec.js', duration: 4.2, group: 1 },
      { name: 'payments/checkout.spec.js', duration: 3.8, group: 2 },
      { name: 'admin/dashboard.spec.js', duration: 3.5, group: 2 },
      { name: 'profile/update.spec.js', duration: 2.9, group: 1 },
    ],
  };
  return JSON.stringify(payload, null, 2);
}


