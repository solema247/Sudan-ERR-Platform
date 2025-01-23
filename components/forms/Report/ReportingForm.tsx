import React, { useEffect, useState } from 'react';
import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import { useTranslation } from 'react-i18next';
import FormBubble from '../../ui/FormBubble';
import Button from '../../ui/Button';
import { supabase } from '../../../services/supabaseClient';
import ExpenseCard from './ExpenseCard';
import getInitialValues from './values';
import getValidationSchema from './validation';
import onSubmit from './uploading';
import { v4 as uuidv4 } from 'uuid';
import Project from '../NewProject/Project'

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes.
type errId = string;

/**
 * F4 Financial Reporting form, called from Menu.tsx
 */

interface ReportingFormProps {
    errId: errId;
    project: Project;
    onReturnToMenu: ()=> void;
    onSubmitAnotherForm: ()=> void; // TODO: Figure out if we still need this.
}

const ReportingForm = ({ errId, project, onReturnToMenu, onSubmitAnotherForm }: ReportingFormProps) => {
    const { t } = useTranslation('fillForm');
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        populateCategories(setCategories)
    }, []);

    const initialValues = getInitialValues(errId);
    const validationSchema = getValidationSchema();

    return (
        <FormBubble>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={onSubmit}
            >
                {({ isSubmitting, values }) => (
                    <Form className="flex flex-col">
                        <p className="text-3xl">{t('formTitle')}</p>

                        <label htmlFor="err_id" className="font-bold block text-base text-black-bold mb-1">
                            {t('errId')}
                        </label>
                        <Field type="text" name="err_id" />
                        <ErrorMessage name="err_id" component="div" />

                        <label htmlFor="date" className="font-bold block text-base text-black-bold mb-1">
                            {t('date')}
                        </label>
                        <Field type="date" name="date" />
                        <ErrorMessage name="date" component="div" />

                        <label htmlFor="total_grant" className="font-bold block text-base text-black-bold mb-1">
                            {t('totalGrant')}
                        </label>
                        <Field type="number" name="total_grant" min="0" />
                        <ErrorMessage name="total_grant" component="div" />

                        <label htmlFor="other_sources" className="font-bold block text-base text-black-bold mb-1">
                            {t('totalOtherSources')}
                        </label>
                        <Field type="number" name="total_other_sources" min="0" />
                        <ErrorMessage name="total_other_sources" component="div" />

                        <h3 className="text-2xl font-bold pt-4">Activities and Expenses</h3>

                        <FieldArray
                            name="expenses"
                            render={(arrayHelpers) => (
                                <div>
                                    {values.expenses.map((expense, index) => (
                                        <ExpenseCard
                                            key={index}
                                            expense={expense}
                                            index={index}
                                            arrayHelpers={arrayHelpers}
                                        />
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

                        <label htmlFor="excess_expenses" className="font-bold block text-base text-black-bold mb-1">
                            {t('excessExpenses')}
                        </label>
                        <Field type="text" name="excessExpenses" />
                        <ErrorMessage name="excessExpenses" component="div" />

                        <label htmlFor="surplus_use" className="font-bold block text-base text-black-bold mb-1">
                            {t('surplusUse')}
                        </label>
                        <Field type="text" name="surplus_use" />
                        <ErrorMessage name="surplus_use" component="div" />

                        <label htmlFor="training" className="font-bold block text-base text-black-bold mb-1">
                            {t('training')}
                        </label>
                        <Field type="text" name="training" />
                        <ErrorMessage name="training" component="div" />

                        <label htmlFor="lessons" className="font-bold block text-base text-black-bold mb-1">
                            {t('lessons')}
                        </label>
                        <Field type="text" name="lessons" />
                        <ErrorMessage name="lessons" component="div" />

                        <label htmlFor="total_expenses" className="font-bold block text-base text-black-bold mb-1">
                            {t('totalExpenses')}
                        </label>
                        <Field type="text" name="total_expenses" />
                        <ErrorMessage name="total_expenses" component="div" />

                        <button type="submit" disabled={isSubmitting}>
                            Submit
                        </button>
                    </Form>
                )}
            </Formik>
        </FormBubble>
    );
};


async function populateCategories(setCategories) {
    const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name, language')
        .eq('language', 'en');

        if (!error) {
           setCategories(data);
       }
}


export default ReportingForm;
