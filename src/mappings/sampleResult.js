const objectApiName = 'Sample_Result__c';

const fieldPaths = [
  'Name',
  'Date__c',
  'Sample_Location__c',
  'Moisture__c',
  'Specific_Weight__c',
  'Nitrogen__c',
  'Protein__c',
  'Hagberg__c',
  'SCR_S_20__c',
  'SCR_S_225__c',
  'SCR_S_25__c',
  'Hardness__c',
  'Admixture_Sum__c',
  'Instruction__c.Name',
  'Instruction__c.Commodity__c.Name',
  'Instruction__c.Variety__c',
  'Instruction__c.Account__c.Name',
];

function map(data) {
  const root = data.Sample_Result__c || data || {};
  const instruction =
    data.Instruction__c ||
    root.Instruction__c ||
    data.Sample_Instruction__c ||
    root.Sample_Instruction__c ||
    {};
  const commodity = instruction.Commodity__c || {};
  const account = data.Account__c || instruction.Account__c || {};

  const proteinValue = root.Protein__c ?? root.Nitrogen__c ?? '';
  const nitrogenValue = root.Nitrogen__c ?? root.Protein__c ?? '';
  const instructionName = instruction.Name ?? '';
  const commodityName = commodity.Name ?? '';
  const accountName = account.Name ?? '';

  return {
    'Sample_Result__c.Name': root.Name ?? '',
    'Sample_Result__c.Date__c': root.Date__c ?? '',
    'Sample_Result__c.Sample_Location__c': root.Sample_Location__c ?? '',
    'Sample_Result__c.Moisture__c': root.Moisture__c ?? '',
    'Sample_Result__c.Specific_Weight__c': root.Specific_Weight__c ?? '',
    'Sample_Result__c.Nitrogen__c': nitrogenValue,
    'Sample_Result__c.Protein__c': proteinValue,
    'Sample_Result__c.Hagberg__c': root.Hagberg__c ?? '',
    'Sample_Result__c.SCR_S_20__c': root.SCR_S_20__c ?? '',
    'Sample_Result__c.SCR_S_225__c': root.SCR_S_225__c ?? '',
    'Sample_Result__c.SCR_S_25__c': root.SCR_S_25__c ?? '',
    'Sample_Result__c.Hardness__c': root.Hardness__c ?? '',
    'Sample_Result__c.Admixture_Sum__c': root.Admixture_Sum__c ?? '',

    'Instruction__c.Name': instructionName,
    'Instruction__c.Commodity__c.Name': commodityName,
    'Instruction__c.Variety__c': instruction.Variety__c ?? '',
    'Instruction__c.Account__c.Name': accountName,

    'Sample_Instruction__c.Name': instructionName,
    'Sample_Instruction__c.Commodity__c.Name': commodityName,
    'Sample_Instruction__c.Account__c.Name': accountName,

    today: '',
  };
}

module.exports = { objectApiName, fieldPaths, map };
