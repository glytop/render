const objectApiName = 'Haulage_Instruction__c';

const fieldPaths = [
  'Name',
  'Delivery_Instruction__c.Date_Created__c',
  'Haulier__c',
  'Grower__c',
  'Contact_Name__c',
  'Telephone__c',
  'Variety__c.Name',
  'Commodity__c.Name',
  'Tonnage__c',
  'Buyer__c',
  'Delivery_Instruction__c.Delivery_Reference_No__c',
  'Haulage_Rate__c',
  'Movement_Sheet__c.Name',
];

function map(data) {
  const root = data.Haulage_Instruction__c || data || {};
  const movementSheet = data.Movement_Sheet__c || root.Movement_Sheet__c || {};
  const deliveryInstruction = data.Delivery_Instruction__c || root.Delivery_Instruction__c || {};
  const commodity = root.Commodity__c || {};
  const variety = root.Variety__c || {};
  const commodityName =
    commodity.Name ??
    root.Commodity__r?.Name ??
    '';
  const varietyName =
    variety.Name ??
    root.Variety__r?.Name ??
    '';

  return {
    'Haulage_Instruction__c.Haulier__c': root.Haulier__c ?? '',
    'Haulage_Instruction__c.Grower__c': root.Grower__c ?? '',
    'Haulage_Instruction__c.Contact_Name__c': root.Contact_Name__c ?? '',
    'Haulage_Instruction__c.Telephone__c': root.Telephone__c ?? '',
    'Haulage_Instruction__c.Variety__c.Name': varietyName,
    'Haulage_Instruction__c.Commodity__c.Name': commodityName,
    'Haulage_Instruction__c.Variety__c': varietyName,
    'Haulage_Instruction__c.Commodity__c': commodityName,
    'Haulage_Instruction__c.Tonnage__c': root.Tonnage__c ?? '',
    'Haulage_Instruction__c.Buyer__c': root.Buyer__c ?? '',
    'Haulage_Instruction__c.Haulage_Rate__c': root.Haulage_Rate__c ?? '',
    'Delivery_Instruction__c.Date_Created__c': deliveryInstruction.Date_Created__c ?? '',
    'Delivery_Instruction__c.Delivery_Reference_No__c': deliveryInstruction.Delivery_Reference_No__c ?? '',
    'Movement_Sheet__c.Name': movementSheet.Name ?? '',
  };
}

module.exports = { objectApiName, fieldPaths, map };
