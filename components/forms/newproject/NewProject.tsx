import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';
import FormBubble from '../../cosmetic/FormBubble';
import DynamicActivityForm from './NewProjectActivities';

interface ProjectApplicationProps {
    onReturnToMenu: () => void; // Add prop for menu navigation
}

/**
 * Project application form 
 * 
 * Known in the F-system as the F1 form
 * (See Framework for Effective Emergency Response in Sudan)
 * 
 * Field data is then posted to the "err-projects" table
 * 
 * @param param0 
 * @returns 
 */

const ProjectApplication: React.FC<ProjectApplicationProps> = ({ onReturnToMenu }) => {
    const { t, i18n } = useTranslation('projectApplication');

    // Form fields
    const [formData, setFormData] = useState({
        date: '',
        err: '',
        state: '',
        locality: '',
        project_objectives: '',
        intended_beneficiaries: '',
        estimated_beneficiaries: '',
        planned_activities: [],
        expenses: [],
        estimated_timeframe: '',
        additional_support: '',
        officer_name: '',
    });

    const [isFormSubmitted, setIsFormSubmitted] = useState(false);
    const [isLoading, setLoading] = useState(false);

    const [plannedActivities, setPlannedActivities] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [stateLocality, setStateLocality] = useState({ states: [], localities: [] });

    // Fetch dropdown options and state-locality mappings (TODO: Security, see issues)

    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/project-application?language=${i18n.language}`);
                if (res.ok) {
                    const data = await res.json();
                    const translatedPlannedActivities = data.plannedActivities.map((activity: any) => ({
                        id: activity.id,
                        name: t(activity.name),
                    }));
                    const translatedExpenseCategories = data.expenseCategories.map((expense: any) => ({
                        id: expense.id,
                        name: t(expense.name),
                    }));
                    setPlannedActivities(translatedPlannedActivities);
                    setExpenseCategories(translatedExpenseCategories);
                    setStateLocality({ states: data.states, localities: [] });
                } else {
                    console.error('Failed to fetch dropdown options');
                }
            } catch (error) {
                console.error('Error fetching dropdown options:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOptions();
    }, [i18n.language, t]);

    // Handle input changes for the form
    const onInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === 'state') {
            const selectedState = stateLocality.states.find((state: any) => state.state_name === value);
            const localities = selectedState ? selectedState.localities : [];
            setStateLocality((prev) => ({ ...prev, localities }));
        }
    };

    // On submission, POST the form to the API.
    // TODO: Move this into a non-UI file

    const onSubmitNewProjectForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/project-application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsFormSubmitted(true);
            } else {
                console.error('Submission failed:', await res.json());
                alert(t('submissionFailed'));
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            alert(t('submissionFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {!isFormSubmitted ? (
            <FormBubble>
                <form onSubmit={onSubmitNewProjectForm} className="space-y-3 bg-white p-3 rounded-lg">

                    {/* Header TODO: Translate */}
                    <p className="text-3xl">New Project Application</p>

                    {/* Date */}
                    <div className="flex flex-col items-top">
                        <label className="font-bold block text-base text-black-bold mr-3">
                            {t('date')}
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={onInputChange}
                            className="text-sm flex-grow p-2 border rounded"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Room ID */}
                    <div className="flex flex-col items-top">
                        <label className="font-bold block text-base text-black-bold mr-3">
                            {t('errId')}
                        </label>
                        <input
                            type="text"
                            name="err"
                            value={formData.err}
                            onChange={onInputChange}
                            className="text-sm flex-grow p-2 border rounded"
                            placeholder={t('enterErrId')}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* State */}
                    <div className="mb-3">
                        <label className="font-bold block text-base text-black-bold mb-1">
                            {t('state')}
                        </label>
                        <select
                            name="state"
                            value={formData.state}
                            onChange={onInputChange}
                            className="text-sm w-full p-2 border rounded"
                            required
                            disabled={isLoading}
                        >
                            <option value="">{t('selectState')}</option>
                            {stateLocality.states.map((state: any, idx: number) => (
                                <option key={idx} value={state.state_name}>
                                    {state.state_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Locality */}
                    <div className="mb-3">
                        <label className="font-bold block text-base text-black-bold mb-1">
                            {t('locality')}
                        </label>
                        <select
                            name="locality"
                            value={formData.locality}
                            onChange={onInputChange}
                            className="text-sm w-full p-2 border rounded"
                            required
                            disabled={isLoading || !formData.state}
                        >
                            <option value="">{t('selectLocality')}</option>
                            {stateLocality.localities.map((locality: string, idx: number) => (
                                <option key={idx} value={locality}>
                                    {locality}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Project Objectives */}
                    <div className="mb-3">
                        <label className="font-bold block text-base text-black-bold mb-1">
                            {t('projectObjectives')}
                        </label>
                        <textarea
                            name="project_objectives"
                            value={formData.project_objectives}
                            onChange={onInputChange}
                            className="text-sm w-full p-2 border rounded"
                            placeholder={t('enterProjectObjectives')}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Intended Beneficiaries */}
                    <div className="mb-3">
                        <label className="font-bold block text-base text-black-bold mb-1">
                            {t('intendedBeneficiaries')}
                        </label>
                        <textarea
                            name="intended_beneficiaries"
                            value={formData.intended_beneficiaries}
                            onChange={onInputChange}
                            className="text-sm w-full p-2 border rounded"
                            placeholder={t('enterIntendedBeneficiaries')}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Estimated Beneficiaries */}
                    <div className="mb-3">
                        <label className="font-bold block text-base text-black-bold mb-1">
                            {t('estimatedBeneficiaries')}
                        </label>
                        <input
                            type="number"
                            name="estimated_beneficiaries"
                            value={formData.estimated_beneficiaries}
                            onChange={onInputChange}
                            className="text-sm w-full p-2 border rounded"
                            placeholder={t('enterEstimatedBeneficiaries')}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Planned Activities (this is a for-each)  */}
                    <DynamicActivityForm
                        title={t('plannedActivities')}
                        options={plannedActivities}
                        onChange={(data) =>
                            setFormData((prev) => ({ ...prev, planned_activities: data }))
                        }
                    />

                    {/* Expenses (this is a for-each) */ }
                    <DynamicActivityForm
                        title={t('expenses')}
                        options={expenseCategories}
                        onChange={(data) =>
                            setFormData((prev) => ({ ...prev, expenses: data }))
                        }
                    />

                    {/* Estimated Timeframe */}
                    <div className="mb-3">
                        <label className="font-bold block text-base text-black-bold mb-1">
                            {t('estimatedTimeframe')}
                        </label>
                        <textarea
                            name="estimated_timeframe"
                            value={formData.estimated_timeframe}
                            onChange={onInputChange}
                            className="text-sm w-full p-2 border rounded"
                            placeholder={t('enterEstimatedTimeframe')}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Additional Support - optional */}
                    <div className="mb-3">
                        <label className="font-bold block text-base text-black-bold mb-1">
                            {t('additionalSupport')}
                        </label>
                        <textarea
                            name="additional_support"
                            value={formData.additional_support}
                            onChange={onInputChange}
                            className="text-sm w-full p-2 border rounded"
                            placeholder={t('enterAdditionalSupport')}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Officer Name */}
                    <div className="mb-3">
                        <label className="font-bold block text-base text-black-bold mb-1">
                            {t('officerName')}
                        </label>
                        <input
                            type="text"
                            name="officer_name"
                            value={formData.officer_name}
                            onChange={onInputChange}
                            className="text-sm w-full p-2 border rounded"
                            placeholder={t('enterOfficerName')}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        text={isLoading ? t('button.processing') : t('button.submit')}
                        disabled={isLoading}
                    />

                </form>
            </FormBubble>
        ) : (

            <div className="bg-white p-4 rounded-lg">
                <p className="text-black-bold text-base mb-4">{t('formSubmitted')}</p>
                <div className="flex justify-center">
                    <Button
                        text={t('returnToMenu')}
                        onClick={() => {
                            setIsFormSubmitted(false);
                            onReturnToMenu();
                        }}
                    />
                </div>
            </div>
        )}

        </>
    );
};

export default ProjectApplication;
