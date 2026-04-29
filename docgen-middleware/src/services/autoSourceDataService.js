const { querySalesforce } = require('./salesforceService');

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function escapeSoqlLiteral(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function normalizeFieldPaths(raw) {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function relationshipSegment(segment) {
  if (segment.endsWith('__c')) return `${segment.slice(0, -3)}__r`;
  if (segment.endsWith('Id') && segment.length > 2) return segment.slice(0, -2);
  return segment;
}

function toSoqlPath(path) {
  const parts = String(path || '').split('.').filter(Boolean);
  if (parts.length <= 1) return path;
  return parts
    .map((part, idx) => (idx < parts.length - 1 ? relationshipSegment(part) : part))
    .join('.');
}

function getByPath(obj, path) {
  const parts = String(path || '').split('.').filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function setByPath(obj, path, value) {
  const parts = String(path || '').split('.').filter(Boolean);
  if (parts.length === 0) return;
  let current = obj;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    if (isLast) {
      current[part] = value;
      return;
    }
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
}

async function resolveAutoSourceData(payload, env) {
  const resolver = payload?.dataResolver || payload?.sourceResolver || {};
  const objectApiName = cleanText(
    resolver.objectApiName || resolver.objectType || payload?.sourceObjectApiName
  );
  const recordId = cleanText(
    resolver.recordId || resolver.id || payload?.sourceRecordId
  );
  const fieldPaths = normalizeFieldPaths(
    resolver.fieldPaths || payload?.sourceFieldPaths
  );
  const targetRoot = cleanText(resolver.targetRoot || objectApiName);

  if (!objectApiName || !recordId || fieldPaths.length === 0) return {};

  const soqlFields = fieldPaths.map((path) => toSoqlPath(path));
  const soql = [
    `SELECT Id, ${soqlFields.join(', ')}`,
    `FROM ${objectApiName}`,
    `WHERE Id = '${escapeSoqlLiteral(recordId)}'`,
    'LIMIT 1',
  ].join(' ');

  const queryResult = await querySalesforce(soql, env);
  const record = Array.isArray(queryResult?.records) ? queryResult.records[0] : null;
  if (!record) return {};

  const resolved = {};
  for (let i = 0; i < fieldPaths.length; i += 1) {
    const originalPath = fieldPaths[i];
    const soqlPath = soqlFields[i];
    const value = getByPath(record, soqlPath);
    setByPath(resolved, originalPath, value === undefined ? '' : value);
  }

  const result = {
    ...resolved,
    source_record_id: recordId,
    source_object_api_name: objectApiName,
  };

  if (targetRoot) {
    result[targetRoot] = resolved;
  }

  return result;
}

module.exports = { resolveAutoSourceData };
