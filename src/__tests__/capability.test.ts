import { inferCapabilityId } from '../utils/capability';

describe('inferCapabilityId', () => {
  it('uses a normalized filename without industry assumptions', () => {
    expect(inferCapabilityId('Customer Intake Form.pdf')).toBe('document.customer.intake.form');
  });

  it('does not infer a capability from document-specific content', () => {
    expect(inferCapabilityId('application.pdf', 'ACORD 125')).toBe('document.application');
  });
});
