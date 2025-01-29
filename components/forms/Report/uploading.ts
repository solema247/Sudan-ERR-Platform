import { uploadImages, ImageCategory } from '../../../services/uploadImages';
import { useTranslation } from 'react-i18next';

// TODO: I think this is the DRY uploading point but double check.

export default async function onSubmit(values, { setSubmitting }) {
    const { t } = useTranslation('fillForm');
    
    const { project } = values; // TODO: Make sure it comes through.

    try {
        const completedExpenses = values.expenses.filter((expense) => expense.receiptFile);

        const uploadedFiles = await Promise.all(
            completedExpenses.map((expense) =>
                uploadImages([expense.receiptFile], ImageCategory.REPORT_EXPENSES_SUPPORTING_IMAGE, project.id, t)
            )
        );

        // onSubmitAnotherForm();           // TODO: Find out what this was for.
    } catch (error) {
        console.error('Error submitting form:', error);
        alert(error.message);
    } finally {
        setSubmitting(false);
    }
}