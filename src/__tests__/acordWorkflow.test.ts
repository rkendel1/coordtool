import { acordLayoutStatus } from '../acord/workflow';

it('describes the dedicated ACORD layout path', () => {
  expect(acordLayoutStatus({ kind: 'acord', formNumber: '125', edition: '03/2016' }))
    .toBe('ACORD 125 (03/2016) mode — loading authoritative PDF fields');
});
