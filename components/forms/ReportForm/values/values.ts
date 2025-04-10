const getInitialValues = (errId: string) => ({
    err_id: errId,
    date: '',
    total_grant: '',
    total_other_sources: '',
    total_expenses: '',
    remainder: '',
    excess_expenses: '',
    surplus_use: '',
    lessons: '',
    training: '',
    beneficiaries: '',
    expenses: [],
    currentLanguage: 'en'
});

export default getInitialValues;