import { AcordProfile } from '../../utils/documentProfile';
import { Field } from '../../types/Field';
import { createAcord125StarterFields } from './acord125';

export function getAcordStarterFields(profile: AcordProfile): Field[] {
  if (profile.formNumber === '125') return createAcord125StarterFields();
  return [];
}

export function hasAcordStarterLayout(profile: AcordProfile): boolean {
  return profile.formNumber === '125';
}
