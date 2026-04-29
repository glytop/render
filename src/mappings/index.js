const opportunity = require('./opportunity');
const account = require('./account');
const contract = require('./contract');
const haulageInstruction = require('./haulageInstruction');

const mappings = {
  Opportunity: opportunity,
  Account: account,
  Contract__c: contract,
  Haulage_Instruction__c: haulageInstruction,
};

function getMapping(objectType) {
  return mappings[objectType];
}

function getMappingByObjectApiName(objectApiName) {
  if (!objectApiName) return null;
  const normalized = String(objectApiName).toLowerCase();
  for (const [objectType, mapping] of Object.entries(mappings)) {
    if (String(objectType).toLowerCase() === normalized) {
      return { objectType, mapping };
    }
    if (String(mapping?.objectApiName || '').toLowerCase() === normalized) {
      return { objectType, mapping };
    }
  }
  return null;
}

module.exports = { getMapping, getMappingByObjectApiName };