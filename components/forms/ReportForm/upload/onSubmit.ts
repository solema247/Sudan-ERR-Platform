import { uploadImages } from '../../../../services/uploadImages';

interface FormValues {
    err_id: string;
    date: string;
    total_grant: string;
    total_other_sources: string;
    total_expenses: string;
    remainder: string;
    excess_expenses: string;
    surplus_use: string;
    lessons: string;
    training: string;
    beneficiaries: string;
    currentLanguage: string;
    expenses: Array<{
        receiptFile?: File;
        // Add other expense properties if needed
    }>;
}

// Old way of submitting expense images.

export const createOnSubmit = (t: (key: string) => string) => async (values: FormValues, formikHelpers: any) => {
    try {
        const completedExpenses = values.expenses.filter((expense) => expense.receiptFile);

        if (completedExpenses.length > 0) {
            const uploadedFiles = await Promise.all(
                completedExpenses.map((expense) =>
                    uploadImages(
                        [expense.receiptFile],
                        values.err_id,
                        'financial'
                    )
                )
            );
        }

        // onSubmitAnotherForm();           // TODO: Find out what this was for.
    } catch (error) {
        console.error('Error submitting form:', error);
        throw error;
    }
};