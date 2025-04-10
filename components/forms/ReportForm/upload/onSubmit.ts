import { uploadImages } from '../../../../services/uploadImages';
import { useTranslation } from 'react-i18next';

// Old way of submitting expense images.

export default async function onSubmit(values, { setSubmitting }) {
    const { t } = useTranslation('fillForm');
    
    const { project, expense_id } = values;

    try {
        const completedExpenses = values.expenses.filter((expense) => expense.receiptFile);

        const uploadedFiles = await Promise.all(
            completedExpenses.map((expense) =>
                uploadImages([expense.receiptFile], project.id, expense_id)
            )
        );

        // onSubmitAnotherForm();           // TODO: Find out what this was for.
    } catch (error) {
        console.error('Error submitting form:', error);
        throw error;
    } finally {
        setSubmitting(false);
    }
}