import * as Yup from 'yup';

// Validation schema for the program report form
export const createValidationScheme = (t: (key: string) => string) => 
  Yup.object().shape({
    report_date: Yup.date()
      .required(t('errorMessages.required')),
    positive_changes: Yup.string()
      .required(t('errorMessages.required')),
    negative_results: Yup.string()
      .required(t('errorMessages.required')),
    unexpected_results: Yup.string()
      .required(t('errorMessages.required')),
    lessons_learned: Yup.string()
      .required(t('errorMessages.required')),
    suggestions: Yup.string()
      .required(t('errorMessages.required')),
    reporting_person: Yup.string()
      .required(t('errorMessages.required')),
    activities: Yup.array().of(
      Yup.object().shape({
        activity_name: Yup.string()
          .required(t('errorMessages.required')),
        activity_goal: Yup.string()
          .required(t('errorMessages.required')),
        location: Yup.string()
          .required(t('errorMessages.required')),
        start_date: Yup.date()
          .required(t('errorMessages.required')),
        end_date: Yup.date()
          .required(t('errorMessages.required')),
        individual_count: Yup.number()
          .min(0, t('errorMessages.positiveNumber'))
          .required(t('errorMessages.required')),
        household_count: Yup.number()
          .min(0, t('errorMessages.positiveNumber'))
          .required(t('errorMessages.required')),
        male_count: Yup.number()
          .min(0, t('errorMessages.positiveNumber'))
          .required(t('errorMessages.required')),
        female_count: Yup.number()
          .min(0, t('errorMessages.positiveNumber'))
          .required(t('errorMessages.required')),
        under18_male: Yup.number()
          .min(0, t('errorMessages.positiveNumber'))
          .required(t('errorMessages.required')),
        under18_female: Yup.number()
          .min(0, t('errorMessages.positiveNumber'))
          .required(t('errorMessages.required'))
      })
    ).min(1, t('errorMessages.minimumOneActivity'))
  }); 