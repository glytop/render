const objectApiName = 'Contract__c';

const fieldPaths = [
  'Name',
  'Quantity__c',
  'Contract_Date__c',
  'Price__c',
  'Quality__c',
  'Position__c',
  'Delivery__c',
  'Payment_terms__c',
  'Account__c.Name',
  'Account__c.AccountNumber',
  'Account__c.Broker__c',
  'Commodity__c.Name',
  'Account__c.BillingStreet',
  'Account__c.BillingPostalCode'
];

function map(data) {
  const contractRoot = data.Contract__c || {};
  const account = data.Account__c || contractRoot.Account__c || {};
  const commodity = data.Commodity__c || contractRoot.Commodity__c || {};
  const location = data.Location__c || contractRoot.Location__c || {};
  return {
    'Contract__c.Name': contractRoot.Name ?? data.Name ?? '',
    'Contract__c.Quantity__c': contractRoot.Quantity__c ?? data.Quantity__c ?? '',
    'Contract__c.Contract_Date__c': contractRoot.Contract_Date__c ?? data.Contract_Date__c ?? '',
    'Contract__c.Price__c': contractRoot.Price__c ?? data.Price__c ?? '',
    'Contract__c.Quality__c': contractRoot.Quality__c ?? data.Quality__c ?? '',
    'Contract__c.Position__c': contractRoot.Position__c ?? data.Position__c ?? '',
    'Contract__c.Delivery__c': contractRoot.Delivery__c ?? data.Delivery__c ?? '',
    'Contract__c.Payment_terms__c': contractRoot.Payment_terms__c ?? data.Payment_terms__c ?? '',
    'Account.Name': account.Name ?? '',
    'Account.AccountNumber': account.AccountNumber ?? '',
    'Account.Broker__c': account.Broker__c ?? '',
    'Commodity__c.Name': commodity.Name ?? '',
    'Account.BillingStreet': account.BillingStreet ?? '',
    'Account.BillingPostalCode': account.BillingPostalCode ?? '',
  };
}

module.exports = { objectApiName, fieldPaths, map };
