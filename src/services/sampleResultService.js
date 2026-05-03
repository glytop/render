const { querySalesforce, getSalesforceServerDate } = require('./salesforceService');

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function escapeSoqlLiteral(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatDateDdMmYyyy(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function buildAdmixtureText(record) {
  const percentage = cleanText(record?.Percentage__c);
  const comment = cleanText(record?.Comment__c || record?.Comments__c);
  if (percentage && comment) return `${percentage}% - ${comment}`;
  if (percentage) return `${percentage}%`;
  return comment;
}

function readInstructionId(payload) {
  return cleanText(
    payload?.sourceData?.Instruction__c ||
      payload?.sourceData?.Sample_Result__c?.Instruction__c ||
      payload?.fieldsData?.Instruction__c
  );
}

function normalizeSampleResultIds(payload) {
  const raw =
    payload?.sampleResultIds ||
    payload?.sampleResultsIds ||
    payload?.sample_result_ids;
  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        typeof item === 'object'
          ? item?.id || item?.recordId || item?.sampleResultId
          : item
      )
      .map((value) => cleanText(value))
      .filter(Boolean);
  }
  const single = cleanText(payload?.sampleResultId || payload?.sample_result_id);
  if (single) return [single];
  const fallbackRecordId = cleanText(payload?.recordId || payload?.sourceRecordId);
  return fallbackRecordId ? [fallbackRecordId] : [];
}

async function fetchSampleResultsByIds(sampleResultIds, env) {
  if (!Array.isArray(sampleResultIds) || sampleResultIds.length === 0) return [];
  const inClause = sampleResultIds
    .map((id) => `'${escapeSoqlLiteral(id)}'`)
    .join(', ');
  const soql = [
    'SELECT Id, Name, Sample_Location__c, Moisture__c, Specific_Weight__c, Nitrogen__c, Protein__c,',
    'SCR_S_20__c, SCR_S_225__c, SCR_S_25__c, Germination__c, Broken_Grains__c, Skinned__c, Hardness__c,',
    'Instruction__c, Instruction__r.Name, Instruction__r.Variety__c,',
    'Instruction__r.Commodity__c, Instruction__r.Commodity__r.Name,',
    'Instruction__r.Account__c, Instruction__r.Account__r.Name',
    'FROM Sample_Result__c',
    `WHERE Id IN (${inClause})`,
  ].join(' ');
  const data = await querySalesforce(soql, env);
  return Array.isArray(data?.records) ? data.records : [];
}

function mapSampleResultRow(record) {
  const instruction = record?.Instruction__r || {};
  const commodity = instruction?.Commodity__r || {};
  const account = instruction?.Account__r || {};
  return {
    id: cleanText(record?.Id),
    instruction_id: cleanText(record?.Instruction__c),
    instruction_name: cleanText(instruction?.Name),
    sample_result_name: cleanText(record?.Name),
    commodity_name: cleanText(commodity?.Name || instruction?.Commodity__c),
    instruction_variety: cleanText(instruction?.Variety__c),
    account_name: cleanText(account?.Name),
    sample_location: cleanText(record?.Sample_Location__c),
    moisture: cleanText(record?.Moisture__c),
    specific_weight: cleanText(record?.Specific_Weight__c),
    nitrogen: cleanText(record?.Nitrogen__c ?? record?.Protein__c),
    protein: cleanText(record?.Protein__c ?? record?.Nitrogen__c),
    scr_s_20: cleanText(record?.SCR_S_20__c),
    scr_s_225: cleanText(record?.SCR_S_225__c),
    scr_s_25: cleanText(record?.SCR_S_25__c),
    germination: cleanText(record?.Germination__c),
    broken_grains: cleanText(record?.Broken_Grains__c),
    skinned: cleanText(record?.Skinned__c),
    hardness: cleanText(record?.Hardness__c),
  };
}

async function fetchAdmixturesByField(linkField, linkId, env) {
  if (!linkField || !linkId) return [];
  const soql = [
    'SELECT Id, Percentage__c, Comments__c',
    'FROM Admixture__c',
    `WHERE ${linkField} = '${escapeSoqlLiteral(linkId)}'`,
    'ORDER BY CreatedDate ASC',
  ].join(' ');

  const data = await querySalesforce(soql, env);
  return Array.isArray(data?.records) ? data.records : [];
}

async function resolveSampleResultContext(payload, env) {
  const objectApiName = cleanText(payload?.objectApiName || payload?.sourceObjectApiName);
  if (objectApiName !== 'Sample_Result__c') return {};

  const orgNow = await getSalesforceServerDate(env);
  const context = {
    today: formatDateDdMmYyyy(orgNow),
  };

  const sampleResultIds = normalizeSampleResultIds(payload);
  if (sampleResultIds.length === 0) return context;

  const records = await fetchSampleResultsByIds(sampleResultIds, env);
  const byId = new Map(records.map((record) => [cleanText(record?.Id), record]));
  const rows = sampleResultIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map(mapSampleResultRow);

  context.sample_results_rows = rows;
  context.sample_results_count = rows.length;

  const firstRow = rows[0] || {};
  context['Instruction__c.Name'] = firstRow.instruction_name || '';
  context['Instruction__c.Commodity__c.Name'] = firstRow.commodity_name || '';
  context['Instruction__c.Variety__c'] = firstRow.instruction_variety || '';
  context['Instruction__c.Account__c.Name'] = firstRow.account_name || '';
  context['Sample_Result__c.Name'] = firstRow.sample_result_name || '';
  context['Sample_Result__c.Sample_Location__c'] = firstRow.sample_location || '';
  context['Sample_Result__c.Moisture__c'] = firstRow.moisture || '';
  context['Sample_Result__c.Specific_Weight__c'] = firstRow.specific_weight || '';
  context['Sample_Result__c.Nitrogen__c'] = firstRow.nitrogen || '';
  context['Sample_Result__c.Protein__c'] = firstRow.protein || '';
  context['Sample_Result__c.SCR_S_20__c'] = firstRow.scr_s_20 || '';
  context['Sample_Result__c.SCR_S_225__c'] = firstRow.scr_s_225 || '';
  context['Sample_Result__c.SCR_S_25__c'] = firstRow.scr_s_25 || '';
  context['Sample_Result__c.Germination__c'] = firstRow.germination || '';
  context['Sample_Result__c.Broken_Grains__c'] = firstRow.broken_grains || '';
  context['Sample_Result__c.Skinned__c'] = firstRow.skinned || '';
  context['Sample_Result__c.Hardness__c'] = firstRow.hardness || '';

  const primarySampleResultId = firstRow.id || sampleResultIds[0] || '';
  const instructionId = firstRow.instruction_id || readInstructionId(payload);

  let admixtureRecords = [];
  const candidates = [
    ['Sample_Result__c', primarySampleResultId],
    ['Sample_ID__c', primarySampleResultId],
    ['Sample_Id__c', primarySampleResultId],
    ['Instruction__c', instructionId],
    ['Sample_Instruction__c', instructionId],
  ];

  for (const [field, idValue] of candidates) {
    if (!idValue) continue;
    try {
      admixtureRecords = await fetchAdmixturesByField(field, idValue, env);
      if (admixtureRecords.length > 0) break;
    } catch (error) {
      const sfErrors = Array.isArray(error?.response?.data) ? error.response.data : [];
      const badField = sfErrors.some((entry) =>
        ['INVALID_FIELD', 'MALFORMED_QUERY', 'INVALID_TYPE'].includes(entry?.errorCode)
      );
      if (!badField) throw error;
    }
  }

  const admixtures = admixtureRecords
    .map((record) => ({
      percentage: cleanText(record?.Percentage__c),
      comment: cleanText(record?.Comment__c || record?.Comments__c),
      text: buildAdmixtureText(record),
    }))
    .filter((entry) => entry.text);

  context.admixtures = admixtures.map((entry) => entry.text).join('\n');
  context.admixtures_list = admixtures;
  context.admixtures_count = admixtures.length;

  return context;
}

module.exports = { resolveSampleResultContext };
