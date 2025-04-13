import React, { useState } from 'react';
import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import { useTranslation } from 'react-i18next';
import FormBubble from '../../ui/FormBubble';
import Button from '../../ui/Button';
import getInitialValues from './values/values';
import { createValidationScheme } from './values/validation';
import Project from '../NewProjectForm/Project';

interface ProgramReportFormProps {
    project: Project;
    onReturnToMenu: () => void;
    onSubmitAnotherForm: () => void;
}

const ProgramReportForm: React.FC<ProgramReportFormProps> = ({ 
    project, 
    onReturnToMenu,
    onSubmitAnotherForm 
}) => {
    const { t } = useTranslation('program-report');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (values: any) => {
        try {
            const response = await fetch('/api/program-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...values,
                    project_id: project.id
                }),
            });

            if (!response.ok) throw new Error('Submission failed');
            
            setIsSubmitted(true);
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(t('errorMessages.submitError'));
        }
    };

    if (isSubmitted) {
        return (
            <FormBubble>
                <div className="prose flex flex-col">
                    <p className="mb-4">{t('formSuccess')}</p>
                    <div className="flex justify-between">
                        <Button text={t('submitAnother')} onClick={onSubmitAnotherForm} />
                        <Button text={t('returnToMenu')} onClick={onReturnToMenu} />
                    </div>
                </div>
            </FormBubble>
        );
    }

    return (
        <FormBubble>
            <Formik
                initialValues={getInitialValues(project.id)}
                validationSchema={createValidationScheme(t)}
                onSubmit={handleSubmit}
            >
                {({ values }) => (
                    <Form className="prose flex flex-col">
                        <span className="text-3xl">{t('formTitle')}</span>
                        <span className="font-bold">{project.project_objectives}</span>

                        {/* Main Form Fields */}
                        <div className="mt-6">
                            <div className="mb-3">
                                <label htmlFor="report_date" className="font-bold block text-base text-black-bold mb-1">
                                    {t('reportDate')}
                                </label>
                                <Field
                                    type="date"
                                    name="report_date"
                                    className="text-sm w-full p-2 border rounded-lg"
                                />
                                <ErrorMessage name="report_date" component="div" className="text-red-500" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="positive_changes" className="font-bold block text-base text-black-bold mb-1">
                                    {t('positiveChanges')}
                                </label>
                                <Field
                                    as="textarea"
                                    name="positive_changes"
                                    className="text-sm w-full p-2 border rounded-lg"
                                    rows={3}
                                />
                                <ErrorMessage name="positive_changes" component="div" className="text-red-500" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="negative_results" className="font-bold block text-base text-black-bold mb-1">
                                    {t('negativeResults')}
                                </label>
                                <Field
                                    as="textarea"
                                    name="negative_results"
                                    className="text-sm w-full p-2 border rounded-lg"
                                    rows={3}
                                />
                                <ErrorMessage name="negative_results" component="div" className="text-red-500" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="unexpected_results" className="font-bold block text-base text-black-bold mb-1">
                                    {t('unexpectedResults')}
                                </label>
                                <Field
                                    as="textarea"
                                    name="unexpected_results"
                                    className="text-sm w-full p-2 border rounded-lg"
                                    rows={3}
                                />
                                <ErrorMessage name="unexpected_results" component="div" className="text-red-500" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="lessons_learned" className="font-bold block text-base text-black-bold mb-1">
                                    {t('lessonsLearned')}
                                </label>
                                <Field
                                    as="textarea"
                                    name="lessons_learned"
                                    className="text-sm w-full p-2 border rounded-lg"
                                    rows={3}
                                />
                                <ErrorMessage name="lessons_learned" component="div" className="text-red-500" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="suggestions" className="font-bold block text-base text-black-bold mb-1">
                                    {t('suggestions')}
                                </label>
                                <Field
                                    as="textarea"
                                    name="suggestions"
                                    className="text-sm w-full p-2 border rounded-lg"
                                    rows={3}
                                />
                                <ErrorMessage name="suggestions" component="div" className="text-red-500" />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="reporting_person" className="font-bold block text-base text-black-bold mb-1">
                                    {t('reportingPerson')}
                                </label>
                                <Field
                                    type="text"
                                    name="reporting_person"
                                    className="text-sm w-full p-2 border rounded-lg"
                                />
                                <ErrorMessage name="reporting_person" component="div" className="text-red-500" />
                            </div>
                        </div>

                        {/* Activities Section */}
                        <h3 className="text-2xl font-bold mt-6 mb-3">{t('activities.title')}</h3>
                        <FieldArray name="activities">
                            {({ push, remove }) => (
                                <div>
                                    {values.activities.map((_, index) => (
                                        <div key={index} className="border p-3 rounded-lg mb-3 bg-gray-50">
                                            <h4 className="font-bold mb-2">Activity {index + 1}</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {/* Activity Fields */}
                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.activityName')}
                                                    </label>
                                                    <Field
                                                        type="text"
                                                        name={`activities.${index}.activity_name`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.activity_name`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.activityGoal')}
                                                    </label>
                                                    <Field
                                                        type="text"
                                                        name={`activities.${index}.activity_goal`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.activity_goal`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.location')}
                                                    </label>
                                                    <Field
                                                        type="text"
                                                        name={`activities.${index}.location`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.location`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.startDate')}
                                                    </label>
                                                    <Field
                                                        type="date"
                                                        name={`activities.${index}.start_date`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.start_date`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.endDate')}
                                                    </label>
                                                    <Field
                                                        type="date"
                                                        name={`activities.${index}.end_date`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.end_date`} component="div" className="text-red-500" />
                                                </div>

                                                {/* Demographics */}
                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.individualCount')}
                                                    </label>
                                                    <Field
                                                        type="number"
                                                        name={`activities.${index}.individual_count`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.individual_count`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.householdCount')}
                                                    </label>
                                                    <Field
                                                        type="number"
                                                        name={`activities.${index}.household_count`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.household_count`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.maleCount')}
                                                    </label>
                                                    <Field
                                                        type="number"
                                                        name={`activities.${index}.male_count`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.male_count`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.femaleCount')}
                                                    </label>
                                                    <Field
                                                        type="number"
                                                        name={`activities.${index}.female_count`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.female_count`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.under18Male')}
                                                    </label>
                                                    <Field
                                                        type="number"
                                                        name={`activities.${index}.under18_male`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.under18_male`} component="div" className="text-red-500" />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-bold block text-base text-black-bold mb-1">
                                                        {t('activities.under18Female')}
                                                    </label>
                                                    <Field
                                                        type="number"
                                                        name={`activities.${index}.under18_female`}
                                                        className="text-sm w-full p-2 border rounded-lg"
                                                    />
                                                    <ErrorMessage name={`activities.${index}.under18_female`} component="div" className="text-red-500" />
                                                </div>
                                            </div>

                                            {values.activities.length > 1 && (
                                                <Button
                                                    text={t('activities.removeActivity')}
                                                    onClick={() => remove(index)}
                                                    className="mt-2 bg-red-500 text-white"
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        text={t('activities.addActivity')}
                                        onClick={() => push(getInitialValues(project.id).activities[0])}
                                        className="mt-3 mb-6"
                                    />
                                </div>
                            )}
                        </FieldArray>

                        <div className="flex justify-between mt-8">
                            <Button text={t('returnToMenu')} onClick={onReturnToMenu} />
                            <Button text={t('submit')} type="submit" />
                        </div>
                    </Form>
                )}
            </Formik>
        </FormBubble>
    );
};

export default ProgramReportForm; 