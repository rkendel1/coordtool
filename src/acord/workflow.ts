import { AcordProfile } from '../utils/documentProfile';

/** ACORD forms are template-driven. They must never enter generic field
 * inference, since their ruled tables look like hundreds of input regions. */
export function acordLayoutStatus(profile: AcordProfile): string {
  const form = profile.formNumber ? ` ${profile.formNumber}` : '';
  const edition = profile.edition ? ` (${profile.edition})` : '';
  return `ACORD${form}${edition} mode — loading authoritative PDF fields`;
}
