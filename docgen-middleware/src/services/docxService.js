const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const { resolveFieldsData, buildContext } = require('./contextService');
const { resolveHeaderContext, resolveHeaderImages } = require('./headerService');
const { createImageModule } = require('./imageModuleService');
const { createValidationError } = require('./validationService');
const { downloadContentVersion } = require('./salesforceService');
const { resolveCompanyInfoContext } = require('./companyInfoService');
const { resolveTermsInfoContext } = require('./termsInfoService');
const { resolveAutoSourceData } = require('./autoSourceDataService');
const { resolveHaulageScheduleContext } = require('./haulageScheduleService');
const { getMappingByObjectApiName } = require('../mappings');

function deepMerge(base, override) {
  if (!base || typeof base !== 'object' || Array.isArray(base)) return override;
  if (!override || typeof override !== 'object' || Array.isArray(override)) return base;

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      merged[key] &&
      typeof merged[key] === 'object' &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = deepMerge(merged[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

async function generateDocx(payload) {
  const { env, docVersionId } = payload || {};
  if (!env) {
    throw createValidationError('env is required');
  }
  if (!docVersionId) {
    throw createValidationError('docVersionId is required');
  }
  const templateBuffer = await downloadContentVersion(docVersionId, env);

  const zip = new PizZip(templateBuffer);
  const mappingByApiName = getMappingByObjectApiName(payload?.objectApiName);
  const payloadWithResolver = {
    ...payload,
    objectType: payload?.objectType || mappingByApiName?.objectType,
  };

  if (!payloadWithResolver?.dataResolver) {
    const sourceRecordId = payload?.recordId || payload?.sourceRecordId;
    const sourceObjectApiName = payload?.objectApiName;
    const fieldPaths = mappingByApiName?.mapping?.fieldPaths;
    if (sourceRecordId && sourceObjectApiName && Array.isArray(fieldPaths) && fieldPaths.length > 0) {
      payloadWithResolver.dataResolver = {
        objectApiName: sourceObjectApiName,
        recordId: sourceRecordId,
        fieldPaths,
      };
    }
  }

  const autoSourceData = await resolveAutoSourceData(payloadWithResolver, env);
  const payloadWithAutoSource = {
    ...payloadWithResolver,
    sourceData: deepMerge(autoSourceData || {}, (payload && payload.sourceData) || {}),
  };
  const resolvedFieldsData = resolveFieldsData(payloadWithAutoSource);
  const {
    headerContext,
    imageById,
  } = await resolveHeaderImages(resolveHeaderContext(payload), env);
  const companyInfoContext = await resolveCompanyInfoContext(payload, env);
  const termsInfoContext = await resolveTermsInfoContext(payload, env);
  const haulageScheduleContext = resolveHaulageScheduleContext(payloadWithAutoSource);
  const imageModule = createImageModule(payloadWithAutoSource, imageById);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
    modules: [imageModule],
  });
  const context = buildContext({
    ...resolvedFieldsData,
    ...headerContext,
    ...companyInfoContext,
    ...termsInfoContext,
    ...haulageScheduleContext,
  });

  doc.render(context);

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

module.exports = { generateDocx };