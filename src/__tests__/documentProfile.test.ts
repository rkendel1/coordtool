import { capabilityForAcord, detectDocumentProfile } from '../utils/documentProfile';

it('recognizes an ACORD form number from embedded PDF text', () => {
  expect(detectDocumentProfile('application.pdf', 'ACORD 125 COMMERCIAL INSURANCE APPLICATION'))
    .toEqual({ kind: 'acord', formNumber: '125', edition: undefined });
});

it('recognizes ACORD from the filename when text extraction is unavailable', () => {
  expect(detectDocumentProfile('ACORD_126.pdf')).toMatchObject({ kind: 'acord', formNumber: '126' });
});

it('leaves ordinary forms on the generic path', () => {
  expect(detectDocumentProfile('intake.pdf', 'Customer intake form')).toEqual({ kind: 'generic' });
});

it('creates a form-specific ACORD capability', () => {
  const profile = detectDocumentProfile('acord-125.pdf');
  if (profile.kind !== 'acord') throw new Error('Expected ACORD profile');
  expect(capabilityForAcord(profile)).toBe('document.acord.125');
});
