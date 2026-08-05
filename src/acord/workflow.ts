import { AcordProfile } from '../utils/documentProfile';
import { hasAcordStarterLayout } from './layouts';

/** ACORD forms are template-driven. They must never enter generic field
 * inference, since their ruled tables look like hundreds of input regions. */
export function acordLayoutStatus(profile: AcordProfile): string {
  const form = profile.formNumber ? ` ${profile.formNumber}` : '';
  const edition = profile.edition ? ` (${profile.edition})` : '';
  return hasAcordStarterLayout(profile)
    ? `ACORD${form}${edition} starter layout loaded — validate and extend it section by section`
    : `ACORD${form}${edition} layout mode — import its versioned layout or draw fields manually`;
}
