import { inferCapabilityId } from '../utils/capability';

describe('inferCapabilityId', () => {
  it('prefers the explicit ACORD form number', () => {
    expect(inferCapabilityId('application.pdf', 'ACORD 125 (2016/03)')).toBe('acord.form.125');
  });

  it('recognizes the commercial insurance application title', () => {
    expect(inferCapabilityId('blank.pdf', 'COMMERCIAL INSURANCE APPLICATION')).toBe('acord.form.125');
  });

  it('uses a normalized filename fallback', () => {
    expect(inferCapabilityId('Carrier Cyber Form.pdf')).toBe('form.carrier.cyber.form');
  });
});
