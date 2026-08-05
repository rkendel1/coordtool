import { ensureUniqueFieldName } from '../utils/fieldNames';
import { Field } from '../types/Field';

const field = (sourceFieldId: string): Field => ({
  id: sourceFieldId, name: sourceFieldId, sourceFieldId,
  semanticKey: `applicant.${sourceFieldId}`, displayLabel: sourceFieldId,
  page: 0, x: 0, y: 0, width: 10, height: 10, type: 'text',
});

it('adds the next available stable suffix to duplicate generated names', () => {
  const result = ensureUniqueFieldName(field('premium'), [field('premium'), field('premium_2')]);
  expect(result.sourceFieldId).toBe('premium_3');
  expect(result.name).toBe('premium_3');
  expect(result.semanticKey).toBe('applicant.premium3');
  expect(result.displayLabel).toBe('premium 3');
});

it('compares names case-insensitively', () => {
  expect(ensureUniqueFieldName(field('Premium'), [field('premium')]).sourceFieldId).toBe('Premium_2');
});
