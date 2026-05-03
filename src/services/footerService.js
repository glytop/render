const { querySalesforce } = require('./salesforceService');

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function escapeSoqlLiteral(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function resolveFooterConfig(payload) {
  return {
    objectApiName: cleanText(payload?.footerObjectApiName) || 'Footer__c',
    recordName: cleanText(payload?.footerRecordName) || 'Sample_Instruction',
    fieldName: cleanText(payload?.footerFieldName) || 'Footer_text__c',
  };
}

function isValidApiName(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(value || ''));
}

async function resolveFooterContext(payload, env) {
  const directFooterText = cleanText(payload?.footer_text || payload?.footerText);
  if (directFooterText) {
    return { footer_text: directFooterText };
  }

  const { objectApiName, recordName, fieldName } = resolveFooterConfig(payload);
  if (!isValidApiName(objectApiName) || !isValidApiName(fieldName)) {
    throw new Error(`Invalid footer config: ${objectApiName}.${fieldName}`);
  }

  const soql = [
    `SELECT ${fieldName}`,
    `FROM ${objectApiName}`,
    `WHERE Name = '${escapeSoqlLiteral(recordName)}'`,
    'LIMIT 1',
  ].join(' ');

  const data = await querySalesforce(soql, env);
  const record = Array.isArray(data?.records) ? data.records[0] : null;
  return {
    footer_text: cleanText(record ? record[fieldName] : ''),
  };
}

module.exports = { resolveFooterContext };
