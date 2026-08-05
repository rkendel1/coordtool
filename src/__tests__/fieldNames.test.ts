import {
  displayLabelFromPdfFieldId,
  ensureUniqueFieldName,
  semanticKeyFromPdfFieldId,
  stripPdfFieldPrefix,
  isPdfDerivedSemanticKey,
  suggestSemanticKey,
} from '../utils/fieldNames';
import { Field } from '../types/Field';

const field = (sourceFieldId: string): Field => ({
  id: sourceFieldId, name: sourceFieldId, sourceFieldId,
  semanticKey: `applicant.${sourceFieldId}`, displayLabel: sourceFieldId,
  page: 0, x: 0, y: 0, width: 10, height: 10, type: 'text',
});

it('rejects semantic keys that leak PDF structure or control types', () => {
  expect(isPdfDerivedSemanticKey('data.form10Page10RadioButtonList')).toBe(true);
  expect(isPdfDerivedSemanticKey('data.topmostSubform0VeteranName')).toBe(true);
  expect(isPdfDerivedSemanticKey('applicant.relationship.status')).toBe(false);
});

it('normalizes leaked keys from a durable display label', () => {
  expect(suggestSemanticKey({
    ...field('form10Page10RadioButtonList'),
    semanticKey: 'data.form10Page10RadioButtonList',
    displayLabel: 'Applicant relationship status',
  })).toBe('applicant.relationship.status');
});

it('provides an actionable fallback suggestion for ambiguous controls', () => {
  expect(suggestSemanticKey({
    ...field('radio'),
    semanticKey: 'data.form10Page10RadioButtonList',
    displayLabel: 'Form 1 Page 1 Radio Button List',
    type: 'checkbox',
  })).toBe('applicant.relationship.status');
});

it.each([
  ['CURRENT MAILING ADDRESS (Number and street or rural route, P.O. Box, City, State and ZIP Code)', 'person.mailingAddress'],
  ['6A. MOBILE TELEPHONE NUMBER (Including Area Code)', 'person.phone.mobile'],
  ['DATE OF BIRTH', 'person.dateOfBirth'],
  ['DATE OF MARRIAGE', 'relationship.marriage.date'],
  ['ROUTING NUMBER', 'bank.routingNumber'],
  ['ACCOUNT NUMBER', 'bank.accountNumber'],
])('normalizes extracted label %s to %s', (displayLabel, expected) => {
  expect(suggestSemanticKey({
    ...field('pdf_field'),
    semanticKey: `data.${displayLabel.replace(/\W+/g, '')}`,
    displayLabel,
  })).toBe(expected);
});

it('qualifies identical date-of-birth labels using their printed section', () => {
  const dateOfBirth = {
    ...field('form1[0].Page_1[0].Date_Of_Birth[0]'),
    semanticKey: 'data.dateOfBirth',
    displayLabel: 'DATE OF BIRTH',
  };
  expect(suggestSemanticKey({
    ...dateOfBirth,
    semanticContext: 'PART I - APPLICANT INFORMATION',
  })).toBe('applicant.dateOfBirth');
  expect(suggestSemanticKey({
    ...dateOfBirth,
    semanticContext: 'PART II - QUALIFYING INDIVIDUAL INFORMATION',
  })).toBe('qualifyingIndividual.dateOfBirth');
});

it('adds the next available stable suffix to duplicate generated names', () => {
  const result = ensureUniqueFieldName(field('premium'), [field('premium'), field('premium_2')]);
  expect(result.sourceFieldId).toBe('premium');
  expect(result.name).toBe('premium_3');
  expect(result.semanticKey).toBe('applicant.premium');
  expect(result.displayLabel).toBe('premium');
});

it('compares names case-insensitively', () => {
  expect(ensureUniqueFieldName(field('Premium'), [field('premium')]).name).toBe('Premium_2');
});

it('hides PDF implementation prefixes from semantic names and labels', () => {
  expect(stripPdfFieldPrefix('f0p30veteransname0')).toBe('veteransname');
  expect(displayLabelFromPdfFieldId('f0p30mailingAddress_street0')).toBe('Mailing Address Street');
  expect(semanticKeyFromPdfFieldId('f0p30mailingAddress_street0')).toBe('data.mailingAddressStreet');
  expect(stripPdfFieldPrefix('form10page_30signaturefield110')).toBe('signaturefield');
});
