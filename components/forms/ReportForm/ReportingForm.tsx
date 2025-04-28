import React, { useEffect, useState } from 'react';
import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import { useTranslation } from 'react-i18next';
import FormBubble from '../../ui/FormBubble';
import Button from '../../ui/Button';
import { supabase } from '../../../services/supabaseClient';
import ExpenseCard from './ExpenseCard';
import getInitialValues from './values/values';
import { createValidationScheme } from './values/validation';
import { createOnSubmit } from './upload/onSubmit';
import Project from '../NewProjectForm/Project'
import expenseValues from './values/expenseValues';
import { v4 as uuidv4 } from 'uuid';
import { newSupabase } from '../../../services/newSupabaseClient';


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes.           // TODO: Do compression.
const TABLE_NAME_EXPENSE_CATEGORIES = 'expense_categories';
const TABLE_NAME_NEW_PROJECT_APPLICATIONS = 'err_projects';
const TABLE_NAME_REPORTS = 'summary';
const TABLE_NAME_EXPENSES = 'expenses';

// TODO: Grab JSON or other record of project application.
// TODO: Push the first expense to the front of the field array.


/**
 * F4 Financial Reporting form, called from Menu.tsx
 */

interface ReportingFormProps {
    errId: string;
    reportId: string;
    project: Project;
    onReturnToMenu: () => void;
    onSubmitAnotherForm: () => void;
    initialDraft?: any;
}


const ReportingForm: React.FC<ReportingFormProps> = ({ errId, reportId, project, onReturnToMenu, onSubmitAnotherForm, initialDraft }: ReportingFormProps) => {
    const { t, i18n } = useTranslation('fillForm');
    const [categories, setCategories] = useState([]);
    const [isFormSubmitted, setIsFormSubmitted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            populateCategories(setCategories, i18n.language)
            populateExpenses(project)    
        }
        fetchData();
    }, [i18n.language, project]);

    const initialValues = getInitialValues(errId, initialDraft);
    const validationSchema = createValidationScheme(t);
    const newExpense = expenseValues;

    const getNewExpense = () => ({
        ...newExpense,
        id: uuidv4(),
    });

    // Calculate total expenses function
    const calculateTotalExpenses = (expenses) => {
        return expenses.reduce((sum, expense) => {
            const amount = parseFloat(expense.amount) || 0;
            return sum + amount;
        }, 0);
    };

    const handleSaveDraft = async (values: any) => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/financial-report-drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    project_id: project.id,
                    summary: {
                        err_id: values.err_id,
                        report_date: values.date,
                        total_grant: values.total_grant,
                        total_other_sources: values.total_other_sources,
                        excess_expenses: values.excess_expenses,
                        surplus_use: values.surplus_use,
                        lessons: values.lessons,
                        training: values.training,
                        total_expenses: values.total_expenses
                    },
                    expenses: values.expenses
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save draft');
            }

            alert(t('drafts.draftSaved'));
            onReturnToMenu(); // Return to menu after successful save
        } catch (error) {
            console.error('Error saving draft:', error);
            alert(t('drafts.saveError'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        {isFormSubmitted ? (
            <AfterFormSubmitted onReturnToMenu={onReturnToMenu} />
          ) : (
        <FormBubble removeBoxShadow>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={createOnSubmit(t)} >
                {({ isSubmitting, values, setFieldValue }) => {
                    // Use normal function instead of useEffect
                    // Update total whenever expenses change
                    const total = calculateTotalExpenses(values.expenses);
                    if (values.total_expenses !== total) {
                        setFieldValue('total_expenses', total);
                    }

                    return (
                        <Form className="prose flex flex-col">
                            <span className="text-3xl">{t('formTitle')}</span>
                            <span className="font-bold">{project.project_objectives}</span>

                            <div className="mt-6 mb-3">
                                <label htmlFor="err_id" className="font-bold block text-base text-black-bold mb-1">
                                    {t('errId')}
                                </label>
                                <Field 
                                    type="text" 
                                    name="err_id" 
                                    className="text-sm w-full p-2 border rounded-lg bg-gray-100" 
                                    disabled={true}
                                />
                                <ErrorMessage name="err_id" component="div" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="date" className="font-bold block text-base text-black-bold mb-1">
                                    {t('date')}
                                </label>
                                <Field type="date" name="date" className="text-sm w-full p-2 border rounded-lg"/>
                                <ErrorMessage name="date" component="div" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="total_grant" className="font-bold block text-base text-black-bold mb-1">
                                    {t('totalGrant')}
                                </label>
                                <Field type="number" name="total_grant" min="0" className="text-sm w-full p-2 border rounded-lg"/>
                                <ErrorMessage name="total_grant" component="div" />
                            </div>

                            <div>
                                <label htmlFor="other_sources" className="font-bold block text-base text-black-bold mb-1">
                                    {t('totalOtherSources')}
                                </label>
                                <Field type="number" name="total_other_sources" min="0" className="text-sm w-full p-2 border rounded-lg"/>
                                <ErrorMessage name="total_other_sources" component="div" />
                            </div>

                            <h3 className="text-2xl font-bold">{t('activitiesAndExpenses')}</h3>

                            <FieldArray
                                name="expenses"
                                render={(arrayHelpers) => (
                                    <div>
                                        {values.expenses.map((expense, index) => (
                                            <ExpenseCard
                                                key={`${expense.id}`}
                                                expense={expense}
                                                index={index}
                                                arrayHelpers={arrayHelpers}
                                                categories={categories}
                                                projectId={project.id}
                                                reportId={reportId}
                                            />
                                        ))}
                                        <Button
                                            text={t('addExpense')}
                                            onClick={() =>
                                                arrayHelpers.push(getNewExpense())
                                            }                                             
                                            className="bg-blue-500 text-white mt-4 mb-8"
                                        />
                                    </div>
                                )}
                            />

                            <div className="mb-3">
                                <label htmlFor="excess_expenses" className="font-bold block text-base text-black-bold mb-1">
                                    {t('excessExpenses')}
                                </label>
                                <Field
                                    name="excess_expenses"
                                    type="text"
                                    className="text-sm w-full p-2 border rounded-lg"
                                    placeholder={t('excessExpenses')}
                                />
                                <ErrorMessage name="excess_expenses" component="div" className="text-red-500" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="surplus_use" className="font-bold block text-base text-black-bold mb-1">
                                    {t('surplusUse')}
                                </label>
                                <Field 
                                    type="text" 
                                    name="surplus_use" 
                                    className="text-sm w-full p-2 border rounded-lg"
                                    placeholder={t('surplusUse')}
                                />
                                <ErrorMessage name="surplus_use" component="div" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="training" className="font-bold block text-base text-black-bold mb-1">
                                    {t('trainingNeeds')}
                                </label>
                                <Field 
                                    type="text" 
                                    name="training" 
                                    className="text-sm w-full p-2 border rounded-lg"
                                    placeholder={t('trainingNeeds')}
                                />
                                <ErrorMessage name="training" component="div" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="lessons" className="font-bold block text-base text-black-bold mb-1">
                                    {t('lessonsLearned')}
                                </label>
                                <Field 
                                    type="text" 
                                    name="lessons" 
                                    className="text-sm w-full p-2 border rounded-lg"
                                    placeholder={t('lessonsLearned')}
                                />
                                <ErrorMessage name="lessons" component="div" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="total_expenses" className="font-bold block text-base text-black-bold mb-1">
                                    {t('totalExpenses')}
                                </label>
                                <Field
                                    name="total_expenses"
                                    type="number"
                                    className="text-sm w-full p-2 border rounded-lg bg-gray-100"
                                    disabled={true}  // Make it read-only
                                />
                                <ErrorMessage name="total_expenses" component="div" />
                            </div>

                            <div className="flex justify-between mb-10">
                                <Button 
                                    text={t('drafts.saveDraft')}
                                    onClick={() => handleSaveDraft(values)}
                                    disabled={isSaving}
                                    variant="secondary"
                                />
                                <Button 
                                    text={t('submitReport')}
                                    onClick={async () =>
                                        await submitEntireForm(values, reportId, project, setIsFormSubmitted)
                                    }  
                                    disabled={isSubmitting}
                                />
                            </div>
                        </Form>
                    );
                }}
            </Formik>
        </FormBubble>
    )}
    </>
    );
};


async function populateCategories(setCategories, language) {
    // Fetch categories in both languages
    const { data, error } = await supabase
        .from(TABLE_NAME_EXPENSE_CATEGORIES)
        .select('id, name, language')
        .or(`language.eq.${language},language.eq.en`); // Fetch both current language and English as fallback

    if (!error && data) {
        // Group by ID and prioritize current language
        const categoriesMap = data.reduce((acc, cat) => {
            if (!acc[cat.id] || cat.language === language) {
                acc[cat.id] = cat;
            }
            return acc;
        }, {});

        // Convert back to array
        const uniqueCategories = Object.values(categoriesMap);
        setCategories(uniqueCategories);
    } else {
        console.error('Error fetching categories:', error);
        alert(error);
    }
}

async function populateExpenses(project: Project) {
    const { data, error } = await supabase
        .from(TABLE_NAME_NEW_PROJECT_APPLICATIONS)
        .select('planned_activities')
        .eq('id', project.id)
}

const submitEntireForm = async (values, reportId: string, project: Project, setIsFormSubmitted) => {
    try {
        // First delete any existing draft records
        const { error: expenseError } = await newSupabase
            .from('err_expense')
            .delete()
            .eq('project_id', project.id)
            .eq('is_draft', true);

        if (expenseError) throw expenseError;

        const { error: summaryError } = await newSupabase
            .from('err_summary')
            .delete()
            .eq('project_id', project.id)
            .eq('is_draft', true);

        if (summaryError) throw summaryError;

        // Then submit the new records
        await submitSummary(values, reportId, project);
        await submitExpenses(values.expenses, reportId, project.id);
        setIsFormSubmitted(true);
    }
    catch(e) {
        alert("Something went wrong while submitting the form.");
        console.log(e);
    }
}


const submitSummary = async (values, reportId: string, project: Project) => {
    try {
        // First get the project's planned activities
        const { data: projectData, error: projectError } = await newSupabase
            .from('err_projects')
            .select('planned_activities')
            .eq('id', project.id)
            .single();

        if (projectError) throw projectError;

        // Convert empty strings to null and strings to numbers for numeric fields
        const summaryJson = {
            err_id: values.err_id,
            project_id: project.id,
            report_date: new Date().toISOString(),
            total_expenses: values.total_expenses === '' ? null : Number(values.total_expenses),
            total_grant: values.total_grant === '' ? null : Number(values.total_grant),
            excess_expenses: values.excess_expenses || null,
            surplus_use: values.surplus_use || null,
            lessons: values.lessons || null,
            training: values.training || null,
            total_other_sources: values.total_other_sources === '' ? null : Number(values.total_other_sources),
            language: values.currentLanguage || 'en',
            remainder: values.remainder === '' ? null : Number(values.remainder),
            beneficiaries: values.beneficiaries === '' ? null : Number(values.beneficiaries),
            project_objectives: project.project_objectives,
            project_name: projectData?.planned_activities || null // Add planned activities as project name
        };

        const { data, error } = await newSupabase
            .from('err_summary')
            .insert([summaryJson])
            .select('id')
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error submitting report:', err.message);
        throw err;
    }
};


const submitExpenses = async (expenses, reportId: string, projectId: string) => {
    console.log('Submitting expenses:', expenses);
    const expensePromises = expenses.map(async (expense) => {
        try {
            // First create the expense record
            const { data, error } = await newSupabase
                .from('err_expense')
                .insert([{
                    project_id: projectId,
                    created_at: new Date().toISOString(),
                    expense_activity: expense.activity,
                    expense_description: expense.description,
                    expense_amount: expense.amount,
                    payment_method: expense.payment_method,
                    receipt_no: expense.receipt_no,
                    seller: expense.seller,
                    payment_date: expense.payment_date,
                    language: "en"
                }])
                .select('expense_id')
                .single();

            if (error) throw error;

            // If there's a receipt file URL, create the receipt record
            if (expense.receiptFile?.uploadedUrl) {
                const { error: receiptError } = await newSupabase
                    .from('receipts')
                    .insert([{
                        expense_id: data.expense_id,
                        image_url: expense.receiptFile.uploadedUrl,
                        created_at: new Date().toISOString()
                    }]);

                if (receiptError) throw receiptError;
            }

            return data.expense_id;
        } catch (err) {
            console.error('Error posting expense:', err.message);
            throw err;
        }
    });

    return Promise.all(expensePromises);
};

interface AfterFormSubmittedProps {
    onReturnToMenu: any
}

const AfterFormSubmitted: React.FC<AfterFormSubmittedProps> = ({ onReturnToMenu }) => {
    const { t } = useTranslation('fillForm');

    return (
        <div className="bg-white p-4 rounded-lg">
            <p className="text-black-bold text-base mb-4">{t('formSubmitted')}</p>
            <div className="flex justify-center">
            <Button text={t('returnToMenu')} onClick={onReturnToMenu} />
            </div>
        </div>
    )
}


export default ReportingForm;