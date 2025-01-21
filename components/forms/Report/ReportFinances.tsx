import React, { useEffect, useState } from 'react';
import { Formik, FieldArray } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import FormBubble from '../../ui/FormBubble';
import Button from '../../ui/Button';
import ReceiptChooser from './ReceiptUploader';
import { supabase } from '../../../services/supabaseClient';
import { uploadImages, ImageCategory } from '../../../services/uploadImages';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes. TODO: Compress files before they upload.

// TODO: Ensure we are adding and removing cards
// TODO: Ensure we are uploading receipts
// TODO: Differentiate somehow between form and supporting files.
// TODO: Prepopulate ERR ID, first expense.
// TODO: Report ID should be assigned when upload begins, right? Or at creation?
// TODO: Wire uploader back up.
// TODO: Wire back up errors on individual array items. How does this


const ReportFinances = ({ project, onReturnToMenu, onSubmitAnotherForm }) => {
    const { t } = useTranslation('fill-form');
    const [categories, setCategories] = useState([]);
    const { projectId } = project; // TODO: Right? Is that where we are pulling this from?
    const reportId = getReportId();

    useEffect(() => {
        const populateCategories = async () => {
            const { data, error } = await supabase
                .from('expense_categories')
                .select('id, name, language')
                .eq('language', 'en');

            if (!error) {
                setCategories(data);
            }
        };
        populateCategories();

        const populateKnownProjectDetails = async () => {
            // TODO: Grab ERR_ID room id and the first known expense.
        }

    }, []);

    const ERROR_MESSAGE_FIELD_REQUIRED = "هذه الخانة مطلوبه.";
    const ERROR_MESSAGE_INVALID_NUMBER = "هذا الرقم غير صالح.";

    <Formik
        initialValues={initialValues},
        validationSchema = {Yup.object({
            err_id: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
            date: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
            total_grant: Yup.number()
                .required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED)
                .min(0, t('errorMessages.invalidNumber') || ERROR_MESSAGE_FIELD_REQUIRED),
            total_other_sources: Yup.number()
                .required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED)
                .min(0, t('errorMessages.invalidNumber') || ERROR_MESSAGE_FIELD_REQUIRED),
            expenses: Yup.array()
                .of(
                    Yup.object({
                        activity: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
                        description: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
                        payment_date: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
                        seller: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
                        payment_method: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
                        receipt_no: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
                        amount: Yup.number()
                            .required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED)
                            .min(0, t('errorMessages.invalidNumber') || ERROR_MESSAGE_INVALID_NUMBER),
                    })
                )
                .min(1, t('errorMessages.minExpenses')),
        })}
        onSubmit = {async (values, { setSubmitting }) => {
            try {
                const completedExpenses = values.expenses.filter((expense) => expense.file);
        
                const uploadedFiles = await Promise.all(
                    completedExpenses.map((expense) =>
                        // TODO: Differentiate between form and supporting images
                        uploadImages([expense.file], ImageCategory.REPORT_EXPENSES_SUPPORTING_IMAGE, project?.id || '', t)
                    )
                );
        
                // const submissionData = {
                //     ...values,
                //     expenses: completedExpenses.map((expense, index) => ({
                //         ...expense,
                //         receipt_url: uploadedFiles[index]?.[0]?.url || '',
                //     })),
                // };
        
                // const response = await fetch('/api/fill-form', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(submissionData),
                // });
        
                // if (!response.ok) throw new Error(t('formSubmitFailed'));
                onSubmitAnotherForm();
            } catch (error) {
                console.error('Error submitting form:', error);
                alert(error.message);
            } finally {
                setSubmitting(false);
            }
        }        
    }>
        <FormBubble title={t('formTitle')} showRequiredLegend>
            <form className="space-y-4">
                <div>
                    <label htmlFor="err_id">{t('errId')}</label>
                    <input
                        id="err_id"
                        name="err_id"
                        type="text"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.err_id}
                        className={`w-full p-2 border rounded ${formik.touched.err_id && formik.errors.err_id ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formik.touched.err_id && formik.errors.err_id && typeof formik.errors.err_id === 'string' && (
                        <div className="text-red-500 text-sm">{formik.errors.err_id}</div>
                    )}
                </div>

                <div>
                    <label htmlFor="date">{t('date')}</label>
                    <input
                        id="date"
                        name="date"
                        type="date"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.date}
                        className={`w-full p-2 border rounded ${formik.touched.date && formik.errors.date ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formik.touched.date && formik.errors.date && typeof formik.errors.date === 'string' && (
                        <div className="text-red-500 text-sm">{formik.errors.date}</div>
                    )}
                </div>

                    <FieldArray
                        name="expenses"
                        render={(arrayHelpers) => (
                            <div>
                                {formik.values.expenses.map((expense, index) => (
                                    // Begin expense card
                                    <div key={index} className="border p-4 rounded mb-4">
                                        <div>
                                            <label htmlFor={`expenses.${index}.activity`}>{t('activity')}</label>
                                            <select
                                                id={`expenses.${index}.activity`}
                                                name={`expenses.${index}.activity`}
                                                value={expense.activity}
                                                onChange={formik.handleChange}
                                                onBlur={formik.handleBlur}
                                                className="w-full p-2 border rounded"
                                            >
                                                <option value="">{t('pleaseSelect')}</option>
                                                {categories.map((category) => (
                                                    <option key={category.id} value={category.name}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <ReceiptChooser
                                            projectId={projectId}
                                            reportId={reportId}
                                            expenseId={`${index}`}
                                            onFileSelect={(file) => formik.setFieldValue(`expenses.${index}.file`, file)}
                                            onError={(error) => alert(error)}
                                        />

                                        <Button
                                            text={t('removeExpense')}
                                            onClick={() => arrayHelpers.remove(index)}
                                            className="mt-4 bg-red-500 text-white"
                                        />
                                    </div>
                                ))}

                                <Button
                                    text={t('addExpense')}
                                    onClick={() =>
                                        arrayHelpers.push({
                                            activity: '',
                                            description: '',
                                            payment_date: '',
                                            seller: '',
                                            payment_method: 'cash',
                                            receipt_no: '',
                                            amount: '',
                                            file: null,
                                        })
                                    }
                                    className="bg-blue-500 text-white mt-4"
                                />
                            </div>
                        )}
                    />

                <Button text={t('submit')} type="submit" disabled={formik.isSubmitting} />
            </form>
        </FormBubble>
        </Formik>
    );
};

// TODO: Check that this is correct...
const getReportId = () => {
    return uuidv4();
}

const initialValues = {
    err_id: '',
    date: '',
    total_grant: '',
    total_other_sources: '',
    expenses: [
        {
            activity: '',
            description: '',
            payment_date: '',
            seller: '',
            payment_method: 'cash',
            receipt_no: '',
            amount: '',
            file: null,
        },
    ],
}



export default ReportFinances;
