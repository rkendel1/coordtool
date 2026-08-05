import { semanticKeyForAcordField } from '../acord/fieldMetadata';

it('maps known ACORD identity fields without generic semantic fallbacks', () => {
  expect(semanticKeyForAcordField('todaysdate', 'Todaysdate', 'date', 0, '125')).toBe('application.date');
  expect(semanticKeyForAcordField('agentsname', 'Agentsname', 'text', 0, '125')).toBe('agency.name');
  expect(semanticKeyForAcordField('effectivedate', 'Effectivedate', 'date', 0, '125')).toBe('policy.effectiveDate');
});

it('namespaces unknown ACORD controls instead of inventing personal data meaning', () => {
  expect(semanticKeyForAcordField('Check Box165', 'Property', 'checkbox', 0, '125'))
    .toBe('acord125.page1.property');
});
