import { getAcordStarterFields, hasAcordStarterLayout } from '../acord/layouts';

it('provides a conservative starter layout for ACORD 125', () => {
  const profile = { kind: 'acord' as const, formNumber: '125' };
  const fields = getAcordStarterFields(profile);
  expect(hasAcordStarterLayout(profile)).toBe(true);
  expect(fields.length).toBeGreaterThan(10);
  expect(fields.find(field => field.name === 'policyNumber')?.semanticKey).toBe('policy.number');
  expect(new Set(fields.map(field => field.id)).size).toBe(fields.length);
});

it('does not pretend unsupported ACORD forms have a layout', () => {
  expect(getAcordStarterFields({ kind: 'acord', formNumber: '130' })).toEqual([]);
});
