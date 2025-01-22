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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes.

/**
 * F4 Financial Reporting form, called from Menu.tsx
 * 
    language
 */

// TODO: Ensure we are uploading receipts
// TODO: Differentiate somehow between form and supporting files.
// TODO: Prepopulate ERR ID, first expense.
// TODO: Report ID should be assigned when upload begins, right? Or at creation?
// TODO: Wire uploader back up.
// TODO: Wire back up errors on individual array items. How does this
// TODO: Wire back up the onBlur, etc. handlers if we need them.


const ReportingForm = ({ errId, project, onReturnToMenu, onSubmitAnotherForm }) => {
    const { t } = useTranslation('fillForm');
    const [categories, setCategories] = useState([]);
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
    }, []);

    const ERROR_MESSAGE_FIELD_REQUIRED = "هذه الخانة مطلوبه.";
    const ERROR_MESSAGE_INVALID_NUMBER = "هذا الرقم غير صالح.";

    const initialValues = {
        err_id: errId,      // TODO: Test
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
                receiptFile: null,
            },
        ],
        excess_expenses: '',
        surplus_use: '',
        training: '',
        lessons: '',
        total_expenses: ''
    };

    return (
        <FormBubble>
            <Formik
                initialValues={initialValues}
                validationSchema={Yup.object({
                    err_id: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
                    date: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
                    total_grant: Yup.number()
                        .required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED)
                        .min(0, t('errorMessages.invalidNumber') || ERROR_MESSAGE_INVALID_NUMBER),
                    total_other_sources: Yup.number()
                        .required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED)
                        .min(0, t('errorMessages.invalidNumber') || ERROR_MESSAGE_INVALID_NUMBER),
                    excess_expenses: Yup.string(),
                    surplus_use: Yup.string(),
                    training: Yup.string(),
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
                onSubmit={async (values, { setSubmitting }) => {
                    try {
                        const completedExpenses = values.expenses.filter((expense) => expense.receiptFile);

                        const uploadedFiles = await Promise.all(
                            completedExpenses.map((expense) =>
                                uploadImages([expense.receiptFile], ImageCategory.REPORT_EXPENSES_SUPPORTING_IMAGE, project.id, t)
                            )
                        );

                        onSubmitAnotherForm();
                    } catch (error) {
                        console.error('Error submitting form:', error);
                        alert(error.message);
                    } finally {
                        setSubmitting(false);
                    }
                }}
            >
                {({
                    values,
                    errors,
                    touched,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    isSubmitting,
                    setFieldValue,
                }) => (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                         <p className="text-3xl">{t('formTitle')}</p>
                         
                        <div>
                            <label htmlFor="err_id" className="font-bold block text-base text-black-bold mb-1">{t('errId')}</label>
                            <input
                                id="err_id"
                                name="err_id"
                                type="text"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.err_id}
                                className={`text-sm w-full p-2 border rounded-lg ${
                                    touched.err_id && errors.err_id ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {touched.err_id && errors.err_id && typeof errors.err_id === 'string' && (
                                <div className="text-red-500 text-sm">{errors.err_id}</div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="date" className="font-bold block text-base text-black-bold mb-1">{t('date')}</label>
                            <input
                                id="date"
                                name="date"
                                type="date"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.date}
                                className={`text-sm w-full p-2 border rounded-lg ${
                                    touched.date && errors.date ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {touched.date && errors.date && typeof errors.date === 'string' && (
                                <div className="text-red-500 text-sm">{errors.date}</div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="total_grant" className="font-bold block text-base text-black-bold mb-1">{t('totalGrant')}</label>
                            <input
                                id="total_grant"
                                name="total_grant"
                                type="number"
                                min="1"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.total_grant}
                                className={`text-sm w-full p-2 border rounded-lg ${
                                    touched.total_grant && errors.total_grant ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {touched.total_grant && errors.total_grant && typeof errors.total_grant === 'string' && (
                                <div className="text-red-500 text-sm">{errors.total_grant}</div>
                            )}
                            <h3 className="text-2xl font-bold pt-4">Activities and Expenses</h3>
                        </div>

                        <div>
                            <label htmlFor="total_other_sources" className="font-bold block text-base text-black-bold mb-1">{t('totalGrant')}</label>
                            <input
                                id="total_other_sources"
                                name="total_other_sources"
                                type="number"
                                min="1"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.total_other_sources}
                                className={`text-sm w-full p-2 border rounded-lg ${
                                    touched.total_other_sources && errors.total_other_sources ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {touched.total_other_sources && errors.total_other_sources && typeof errors.total_other_sources === 'string' && (
                                <div className="text-red-500 text-sm">{errors.total_other_sources}</div>
                            )}
                            <h3 className="text-2xl font-bold pt-4">Activities and Expenses</h3>
                        </div>

                        <div>
                            <label htmlFor="excess_expenses" className="font-bold block text-base text-black-bold mb-1">{t('totalGrant')}</label>
                            <input
                                id="excess_expenses"
                                name="excess_expenses"
                                type="text"
                                min="1"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.excess_expenses}
                                className={`text-sm w-full p-2 border rounded-lg ${
                                    touched.excess_expenses && errors.excess_expenses ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {touched.excess_expenses && errors.excess_expenses && typeof errors.excess_expenses === 'string' && (
                                <div className="text-red-500 text-sm">{errors.excess_expenses}</div>
                            )}
                            <h3 className="text-2xl font-bold pt-4">Activities and Expenses</h3>
                        </div>


                        

                        <FieldArray
                            name="expenses"
                            render={(arrayHelpers) => (
                                <div>
                                    {values.expenses.map((expense, index) => (
                                        <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-md">
                                            <div>
                                                <label htmlFor={`expenses.${index}.activity`} className="font-bold block text-base text-black-bold mb-1" >{t('activity')}
                                                </label>
                                                <select
                                                    id={`expenses.${index}.activity`}
                                                    name={`expenses.${index}.activity`}
                                                    value={expense.activity}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
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
                                                onFileSelect={(file) => setFieldValue(`expenses.${index}.file`, file)}
                                                onError={(error) => alert(error)}
                                            />

                                        <button
                                            type="button"
                                            className="text-red-500 mt-2 font-bold"
                                            onClick={() => arrayHelpers.remove(index)}
                                        >
                                        {t('remove')}
                                        </button>
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

                        <Button text={t('submitReport')} type="submit" disabled={isSubmitting} />
                    </form>
                )}
            </Formik>
        </FormBubble>
    );
};

const getReportId = () => uuidv4();

export default ReportingForm;
