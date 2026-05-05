const { querySalesforce } = require('./salesforceService');

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function escapeSoqlLiteral(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatDateDdMmYyyy(value) {
  const raw = clean(value);
  if (!raw) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function buildDescriptionInvoice(row) {
  return [
    clean(row.commodity),
    row.delivery_address ? `Delivered to ${clean(row.delivery_address)}` : '',
    row.delivery_reference ? `Del. Ref ${clean(row.delivery_reference)}` : '',
    row.booking_reference ? `Booking Ref ${clean(row.booking_reference)}` : '',
    clean(row.w_t_no),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function mapInvoiceLineRow(record) {
  return {
    id: clean(record?.Id),
    haulier_name: clean(record?.Haulier__r?.Name),
    line_text: clean(record?.Line_Text__c),
    pre_vat_total: clean(record?.Pre_VAT_Total__c),
    quantity: clean(record?.Quantity__c),
    reg_no: clean(record?.Reg_No__c),
    unit_price: clean(record?.Unit_Price__c),
    vat: clean(record?.VAT__c),
    vat_amount: clean(record?.VAT_Amount__c),
    delivery_date: formatDateDdMmYyyy(record?.Delivery_Date__c),
    booking_reference: clean(
      record?.Movement__r?.Booking_Reference__c ??
        record?.Movement__r?.Booking_Reference_No__c
    ),
    w_t_no: clean(record?.Movement__r?.W_T_No__c),
    tonnage: clean(record?.Movement__r?.Tonnage__c),
    commodity: clean(record?.Movement__r?.Movement_Sheet__r?.Commodity__c),
    delivery_address: clean(
      record?.Movement__r?.Movement_Sheet__r?.Delivery_Address__c
    ),
    delivery_reference: clean(
      record?.Movement__r?.Movement_Sheet__r?.Delivery_Reference__c
    ),
  };
}

async function resolveInvoiceContext(payload, env) {
  const objectApiName = clean(payload?.objectApiName || payload?.sourceObjectApiName);
  const invoiceId = clean(payload?.recordId || payload?.sourceRecordId);
  if (objectApiName !== 'Invoice__c' || !invoiceId) return {};

  const soql = [
    'SELECT Id, Haulier__r.Name, Line_Text__c, Pre_VAT_Total__c, Quantity__c, Reg_No__c, Unit_Price__c, VAT__c, VAT_Amount__c,',
    'Delivery_Date__c, Movement__r.Booking_Reference_No__c, Movement__r.W_T_No__c, Movement__r.Tonnage__c,',
    'Movement__r.Movement_Sheet__r.Commodity__c, Movement__r.Movement_Sheet__r.Delivery_Address__c, Movement__r.Movement_Sheet__r.Delivery_Reference__c',
    'FROM Invoice_Line__c',
    `WHERE Invoice__c = '${escapeSoqlLiteral(invoiceId)}'`,
    'ORDER BY CreatedDate ASC',
  ].join(' ');

  const data = await querySalesforce(soql, env);
  const rows = (Array.isArray(data?.records) ? data.records : []).map(mapInvoiceLineRow);
  const first = rows[0] || {};

  const context = {
    invoice_line_rows: rows,
    invoice_line_rows_count: rows.length,
    description_invoice: buildDescriptionInvoice(first),
    description: buildDescriptionInvoice(first),
    Invoice_Line__c: {
      Haulier__c: { Name: first.haulier_name || '' },
      Line_Text__c: first.line_text || '',
      Pre_VAT_Total__c: first.pre_vat_total || '',
      Quantity__c: first.quantity || '',
      Reg_No__c: first.reg_no || '',
      Unit_Price__c: first.unit_price || '',
      VAT__c: first.vat || '',
      VAT_Amount__c: first.vat_amount || '',
      Delivery_Date__c: first.delivery_date || '',
      Movement__c: {
        Booking_Reference_No__c: first.booking_reference || '',
        W_T_No__c: first.w_t_no || '',
        Tonnage__c: first.tonnage || '',
        Movement_Sheet__c: {
          Commodity__c: first.commodity || '',
          Delivery_Address__c: first.delivery_address || '',
          Delivery_Reference__c: first.delivery_reference || '',
        },
      },
    },
    'Invoice_Line__c.Haulier__c.Name': first.haulier_name || '',
    'Invoice_Line__c.Line_Text__c': first.line_text || '',
    'Invoice_Line__c.Pre_VAT_Total__c': first.pre_vat_total || '',
    'Invoice_Line__c.Quantity__c': first.quantity || '',
    'Invoice_Line__c.Reg_No__c': first.reg_no || '',
    'Invoice_Line__c.Unit_Price__c': first.unit_price || '',
    'Invoice_Line__c.VAT__c': first.vat || '',
    'Invoice_Line__c.VAT_Amount__c': first.vat_amount || '',
    'Invoice_Line__c.Delivery_Date__c': first.delivery_date || '',
    'Invoice_Line__c.Movement__c.Booking_Reference_No__c': first.booking_reference || '',
    'Invoice_Line__c.Movement__c.W_T_No__c': first.w_t_no || '',
    'Invoice_Line__c.Movement__c.Tonnage__c': first.tonnage || '',
    'Invoice_Line__c.Movement__c.Movement_Sheet__c.Commodity__c': first.commodity || '',
    'Invoice_Line__c.Movement__c.Movement_Sheet__c.Delivery_Address__c':
      first.delivery_address || '',
    'Invoice_Line__c.Movement__c.Movement_Sheet__c.Delivery_Reference__c':
      first.delivery_reference || '',
  };

  return context;
}

module.exports = { resolveInvoiceContext };
