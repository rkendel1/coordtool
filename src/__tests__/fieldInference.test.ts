import { inferFieldMetadata } from '../utils/fieldInference';
import { Field } from '../types/Field';

const makeField = (sourceFieldId: string, displayLabel = ''): Field => ({
  id: '1', name: sourceFieldId, sourceFieldId, semanticKey: `data.${sourceFieldId}`,
  displayLabel, page: 0, x: 0, y: 0, width: 50, height: 12, type: 'text',
});

it('infers a date field from a generated PDF field name', () => {
  const result = inferFieldMetadata(makeField('form10page_30datesigned20'));
  expect(result.type).toBe('date');
  expect(result.transformType).toBe('date');
  expect(result.dateFormat).toBe('MM/DD/YYYY');
});

it('infers date format from the visible label', () => {
  const result = inferFieldMetadata(makeField('field_20', 'Date separated (DD/MM/YYYY)'));
  expect(result.type).toBe('date');
  expect(result.dateFormat).toBe('DD/MM/YYYY');
});

it('does not override explicit checkbox types', () => {
  expect(inferFieldMetadata({ ...makeField('effective_date'), type: 'checkbox' }).type).toBe('checkbox');
});

it('infers signature fields from generated PDF names', () => {
  expect(inferFieldMetadata(makeField('form10page_30signaturefield110')).type).toBe('signature');
  expect(inferFieldMetadata(makeField('applicant_sign_here')).type).toBe('signature');
});
