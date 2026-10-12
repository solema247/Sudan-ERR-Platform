export type F5WizardKind = 'activities' | 'demographics' | 'questions';

// Region / page / viewer types are identical to the F4 wizard — shared.
export {
  normalizeWizardPage,
  type RegionSelection,
  type WizardPageEntry,
  type WizardViewerMode,
} from '../../f4/wizard/types';
