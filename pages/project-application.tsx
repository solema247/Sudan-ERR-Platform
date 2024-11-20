//pages/project-application.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import FormBubble from '../components/FormBubble';
import MessageBubble from '../components/MessageBubble';
import DynamicActivityForm from '../components/DynamicActivityForm';

interface ProjectApplicationProps {
    onReturnToMenu: () => void; // Add prop for menu navigation
}

const ProjectApplication: React.FC<ProjectApplicationProps> = ({ onReturnToMenu }) => {
    const { t, i18n } = useTranslation('projectApplication');
    const [plannedActivities, setPlannedActivities] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [stateLocality, setStateLocality] = useState({ states: [], localities: [] });
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
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch dropdown options and state-locality mappings
    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/project-application?language=${i18n.language}`);
                if (res.ok) {
                    const data = await res.json();

                    // Map fetched data to translation keys
                    const translatedPlannedActivities = data.plannedActivities.map((activity: any) => ({
                        id: activity.id,
                        name: t(activity.name), // Map `name` to translation key
                    }));

                    const translatedExpenseCategories = data.expenseCategories.map((expense: any) => ({
                        id: expense.id,
                        name: t(expense.name), // Map `name` to translation key
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
    }, [i18n.language, t]); // Include `t` for dynamic translations

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Dynamically update localities based on selected state
        if (name === 'state') {
            const selectedState = stateLocality.states.find((state: any) => state.state_name === value);
            const localities = selectedState ? selectedState.localities : [];
            setStateLocality((prev) => ({ ...prev, localities }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        console.log('Submitting form data:', formData);

        try {
            const res = await fetch('/api/project-application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setFormSubmitted(true);
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
            {!formSubmitted ? (
                <FormBubble>
                    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-md">
                        {/* Date */}
                        <label>
                            {t('date')}
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                required
                                disabled={loading}
                            />
                        </label>

                        {/* ERR ID */}
                        <label>
                            {t('errId')}
                            <input
                                type="text"
                                name="err"
                                value={formData.err}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                placeholder={t('enterErrId')}
                                required
                                disabled={loading}
                            />
                        </label>

                        {/* State */}
                        <label>
                            {t('state')}
                            <select
                                name="state"
                                value={formData.state}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                required
                                disabled={loading}
                            >
                                <option value="">{t('selectState')}</option>
                                {stateLocality.states.map((state: any, idx: number) => (
                                    <option key={idx} value={state.state_name}>
                                        {state.state_name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Locality */}
                        <label>
                            {t('locality')}
                            <select
                                name="locality"
                                value={formData.locality}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                required
                                disabled={loading || !formData.state}
                            >
                                <option value="">{t('selectLocality')}</option>
                                {stateLocality.localities.map((locality: string, idx: number) => (
                                    <option key={idx} value={locality}>
                                        {locality}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Project Objectives */}
                        <label>
                            {t('projectObjectives')}
                            <textarea
                                name="project_objectives"
                                value={formData.project_objectives}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                placeholder={t('enterProjectObjectives')}
                                required
                                disabled={loading}
                            />
                        </label>

                        {/* Intended Beneficiaries */}
                        <label>
                            {t('intendedBeneficiaries')}
                            <textarea
                                name="intended_beneficiaries"
                                value={formData.intended_beneficiaries}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                placeholder={t('enterIntendedBeneficiaries')}
                                required
                                disabled={loading}
                            />
                        </label>

                        {/* Estimated Number of Beneficiaries */}
                        <label>
                            {t('estimatedBeneficiaries')}
                            <input
                                type="number"
                                name="estimated_beneficiaries"
                                value={formData.estimated_beneficiaries}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                placeholder={t('enterEstimatedBeneficiaries')}
                                required
                                disabled={loading}
                            />
                        </label>

                        {/* Planned Activities */}
                        <DynamicActivityForm
                            title={t('plannedActivities')}
                            options={plannedActivities}
                            onChange={(data) =>
                                setFormData((prev) => ({ ...prev, planned_activities: data }))
                            }
                        />

                        {/* Expenses */}
                        <DynamicActivityForm
                            title={t('expenses')}
                            options={expenseCategories}
                            onChange={(data) =>
                                setFormData((prev) => ({ ...prev, expenses: data }))
                            }
                        />

                        {/* Estimated Timeframe */}
                        <label>
                            {t('estimatedTimeframe')}
                            <textarea
                                name="estimated_timeframe"
                                value={formData.estimated_timeframe}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                placeholder={t('enterEstimatedTimeframe')}
                                required
                                disabled={loading}
                            />
                        </label>

                        {/* Additional Support */}
                        <label>
                            {t('additionalSupport')}
                            <textarea
                                name="additional_support"
                                value={formData.additional_support}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                placeholder={t('enterAdditionalSupport')}
                                disabled={loading}
                            />
                        </label>

                        {/* Officer Name */}
                        <label>
                            {t('officerName')}
                            <input
                                type="text"
                                name="officer_name"
                                value={formData.officer_name}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                placeholder={t('enterOfficerName')}
                                required
                                disabled={loading}
                            />
                        </label>

                        <Button type="submit" text={loading ? t('loading') : t('submit')} disabled={loading} />
                    </form>
                </FormBubble>
            ) : (
                <MessageBubble>
                    {t('formSubmitted')}
                    <Button
                        text={t('returnToMenu')}
                        onClick={() => {
                            setFormSubmitted(false);
                            onReturnToMenu(); // Trigger menu navigation
                        }}
                    />
                </MessageBubble>
            )}
        </>
    );
};

export default ProjectApplication;
