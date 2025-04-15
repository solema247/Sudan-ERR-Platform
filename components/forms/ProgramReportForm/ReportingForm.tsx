import React, { useState } from 'react';
import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import { useTranslation } from 'react-i18next';
import FormBubble from '../../ui/FormBubble';
import Button from '../../ui/Button';
import getInitialValues from './values/values';
import { createValidationScheme } from './values/validation';
import Project from '../NewProjectForm/Project';
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { UploadChooserSupporting } from './upload/UploadChooserSupporting';
import { UploadedList } from './upload/UploadedList';
import { FileWithProgress, UploadedFile } from './upload/UploadInterfaces';
import { createOnSubmit } from './upload/onSubmit';

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
    const [collapsedActivities, setCollapsedActivities] = useState<{[key: number]: boolean}>({});
    const [uploadingFiles, setUploadingFiles] = useState<FileWithProgress[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{[key: number]: number}>({});

    const handleFilesSelected = (files: FileWithProgress[]) => {
        setUploadingFiles(prev => [...prev, ...files]);
    };

    const handleRemoveUploaded = (id: string) => {
        // This will be handled in formik setFieldValue
    };

    const setFileProgress = (index: number, progress: number) => {
        setUploadProgress(prev => ({
            ...prev,
            [index]: progress
        }));
    };

    const handleSubmit = async (values: any) => {
        try {
            const submitHandler = createOnSubmit(t);
            await submitHandler(
                values,
                project.id,
                uploadingFiles,
                setFileProgress
            );
            setIsSubmitted(true);
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(t('errorMessages.submitError'));
        }
    };

    const toggleActivity = (index: number) => {
        setCollapsedActivities(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    if (isSubmitted) {
        return (
            <FormBubble removeBoxShadow>
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
        <FormBubble removeBoxShadow>
            <Formik
                initialValues={getInitialValues(project.id)}
                validationSchema={createValidationScheme(t)}
                onSubmit={handleSubmit}
            >
                {({ values, setFieldValue }) => (
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
                        <h3 className="text-2xl font-bold mt-4 mb-2">{t('activities.title')}</h3>
                        <FieldArray name="activities">
                            {({ push, remove }) => (
                                <div>
                                    {values.activities.map((_, index) => (
                                        <div key={index} className="border pt-1 px-2 pb-2 rounded-lg mb-2 bg-gray-50">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold mb-1">Activity {index + 1}</h4>
                                                <div className="flex items-center gap-2">
                                                    {values.activities.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => remove(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 size={24} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleActivity(index)}
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
                                                        {collapsedActivities[index] ? (
                                                            <ChevronDown size={24} />
                                                        ) : (
                                                            <ChevronUp size={24} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {!collapsedActivities[index] && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                                    {/* Activity Fields */}
                                                    <div className="mb-1">
                                                        <label className="font-bold block text-base text-black-bold mb-0.5">
                                                            {t('activities.activityName')}
                                                        </label>
                                                        <Field
                                                            type="text"
                                                            name={`activities.${index}.activity_name`}
                                                            className="text-sm w-full p-2 border rounded-lg"
                                                        />
                                                        <ErrorMessage name={`activities.${index}.activity_name`} component="div" className="text-red-500" />
                                                    </div>

                                                    <div className="mb-1">
                                                        <label className="font-bold block text-base text-black-bold mb-0.5">
                                                            {t('activities.activityGoal')}
                                                        </label>
                                                        <Field
                                                            type="text"
                                                            name={`activities.${index}.activity_goal`}
                                                            className="text-sm w-full p-2 border rounded-lg"
                                                        />
                                                        <ErrorMessage name={`activities.${index}.activity_goal`} component="div" className="text-red-500" />
                                                    </div>

                                                    <div className="mb-1">
                                                        <label className="font-bold block text-base text-black-bold mb-0.5">
                                                            {t('activities.location')}
                                                        </label>
                                                        <Field
                                                            type="text"
                                                            name={`activities.${index}.location`}
                                                            className="text-sm w-full p-2 border rounded-lg"
                                                        />
                                                        <ErrorMessage name={`activities.${index}.location`} component="div" className="text-red-500" />
                                                    </div>

                                                    <div className="mb-1">
                                                        <label className="font-bold block text-base text-black-bold mb-0.5">
                                                            {t('activities.startDate')}
                                                        </label>
                                                        <Field
                                                            type="date"
                                                            name={`activities.${index}.start_date`}
                                                            className="text-sm w-full p-2 border rounded-lg"
                                                        />
                                                        <ErrorMessage name={`activities.${index}.start_date`} component="div" className="text-red-500" />
                                                    </div>

                                                    <div className="mb-1">
                                                        <label className="font-bold block text-base text-black-bold mb-0.5">
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
                                                    <div className="grid grid-cols-2 gap-1">
                                                        <div className="mb-1">
                                                            <div className="h-14">
                                                                <label className="font-bold block text-base text-black-bold mb-0.5">
                                                                    {t('activities.individualCount')}
                                                                </label>
                                                            </div>
                                                            <Field
                                                                type="number"
                                                                name={`activities.${index}.individual_count`}
                                                                className="text-sm w-full p-2 border rounded-lg"
                                                                onChange={(e) => {
                                                                    const individualCount = parseInt(e.target.value) || 0;
                                                                    const householdCount = Math.ceil(individualCount / 5);
                                                                    setFieldValue(`activities.${index}.individual_count`, individualCount);
                                                                    setFieldValue(`activities.${index}.household_count`, householdCount);
                                                                }}
                                                            />
                                                            <ErrorMessage name={`activities.${index}.individual_count`} component="div" className="text-red-500" />
                                                        </div>

                                                        <div className="mb-1">
                                                            <div className="h-14">
                                                                <label className="font-bold block text-base text-black-bold mb-0.5">
                                                                    {t('activities.householdCount')}
                                                                </label>
                                                            </div>
                                                            <Field
                                                                type="number"
                                                                name={`activities.${index}.household_count`}
                                                                className="text-sm w-full p-2 border rounded-lg bg-gray-100"
                                                                disabled={true}
                                                            />
                                                            <ErrorMessage name={`activities.${index}.household_count`} component="div" className="text-red-500" />
                                                        </div>
                                                    </div>

                                                    {/* Males and Females in one row */}
                                                    <div className="grid grid-cols-2 gap-1">
                                                        <div className="mb-1">
                                                            <label className="font-bold block text-base text-black-bold mb-0.5">
                                                                {t('activities.maleCount')}
                                                            </label>
                                                            <Field
                                                                type="number"
                                                                name={`activities.${index}.male_count`}
                                                                className="text-sm w-full p-2 border rounded-lg"
                                                            />
                                                            <ErrorMessage name={`activities.${index}.male_count`} component="div" className="text-red-500" />
                                                        </div>

                                                        <div className="mb-1">
                                                            <label className="font-bold block text-base text-black-bold mb-0.5">
                                                                {t('activities.femaleCount')}
                                                            </label>
                                                            <Field
                                                                type="number"
                                                                name={`activities.${index}.female_count`}
                                                                className="text-sm w-full p-2 border rounded-lg"
                                                            />
                                                            <ErrorMessage name={`activities.${index}.female_count`} component="div" className="text-red-500" />
                                                        </div>
                                                    </div>

                                                    {/* Under 18 Males and Females in one row */}
                                                    <div className="grid grid-cols-2 gap-1">
                                                        <div className="mb-1">
                                                            <label className="font-bold block text-base text-black-bold mb-0.5">
                                                                {t('activities.under18Male')}
                                                            </label>
                                                            <Field
                                                                type="number"
                                                                name={`activities.${index}.under18_male`}
                                                                className="text-sm w-full p-2 border rounded-lg"
                                                            />
                                                            <ErrorMessage name={`activities.${index}.under18_male`} component="div" className="text-red-500" />
                                                        </div>

                                                        <div className="mb-1">
                                                            <label className="font-bold block text-base text-black-bold mb-0.5">
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
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        text={t('activities.addActivity')}
                                        onClick={() => push(getInitialValues(project.id).activities[0])}
                                        className="mt-2 mb-1"
                                    />
                                </div>
                            )}
                        </FieldArray>

                        {/* Add file upload section before submit button */}
                        <div className="mt-2">
                            <h3 className="text-2xl font-bold mb-4">{t('upload.title')}</h3>
                            <UploadChooserSupporting
                                onFilesSelected={handleFilesSelected}
                                disabled={isSubmitted}
                            />
                            <UploadedList
                                uploadingFiles={uploadingFiles}
                                uploadedFiles={values.uploadedFiles}
                                onRemoveUploaded={(id) => {
                                    setFieldValue(
                                        'uploadedFiles',
                                        values.uploadedFiles.filter((f: UploadedFile) => f.id !== id)
                                    );
                                }}
                            />
                        </div>

                        <div className="flex justify-center mt-8">
                            <Button text={t('submit')} type="submit" />
                        </div>
                    </Form>
                )}
            </Formik>
        </FormBubble>
    );
};

export default ProgramReportForm; 