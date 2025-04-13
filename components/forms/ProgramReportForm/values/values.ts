import { UploadedFile } from '../upload/UploadInterfaces';

// Initial values for the program report form
const getInitialValues = (errId: string) => ({
  report_date: '',
  positive_changes: '',
  negative_results: '',
  unexpected_results: '',
  lessons_learned: '',
  suggestions: '',
  reporting_person: '',
  activities: [{
    id: crypto.randomUUID(),
    activity_name: '',
    activity_goal: '',
    location: '',
    start_date: '',
    end_date: '',
    individual_count: 0,
    household_count: 0,
    male_count: 0,
    female_count: 0,
    under18_male: 0,
    under18_female: 0
  }],
  uploadedFiles: [] as UploadedFile[],
});

export default getInitialValues; 