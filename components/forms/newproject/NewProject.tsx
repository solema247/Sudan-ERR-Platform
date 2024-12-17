import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import Button from '../../ui/Button';
import FormBubble from '../../cosmetic/FormBubble';
import ActivitiesFieldArray from './ActivitiesFieldArray';

const ProjectApplication = ({ onReturnToMenu }) => {
  const { t, i18n } = useTranslation('projectApplication');
  const [stateLocality, setStateLocality] = useState({ states: [], localities: [] });
  const [optionsActivities, setOptionsActivities] = useState([]);
  const [optionsExpenses, setOptionsExpenses] = useState([]);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/project-application?language=${i18n.language}`);
        if (res.ok) {
          const data = await res.json();
          setOptionsActivities(data.plannedActivities.map(({ id, name }) => ({ value: id, label: t(name) })));
          setOptionsExpenses(data.expenseCategories.map(({ id, name }) => ({ value: id, label: t(name) })));
          setStateLocality({ states: data.states, localities: [] });
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, [i18n.language, t]);

  const validationSchema = Yup.object({
    date: Yup.string().required(t('validation.required')),
    err: Yup.string().required(t('validation.required')),
    state: Yup.string().required(t('validation.required')),
    locality: Yup.string().required(t('validation.required')),
    planned_activities: Yup.array().of(
      Yup.object({
        selectedActivity: Yup.string().required(t('validation.required')),
        quantity: Yup.number().required(t('validation.required')),
        expenses: Yup.array().of(
          Yup.object({
            description: Yup.string().required(t('validation.required')),
            amount: Yup.number().required(t('validation.required')),
          }),
        ),
      }),
    ),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/project-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setIsFormSubmitted(true);
      } else {
        console.error('Submission failed:', await res.json());
        alert(t('submissionFailed'));
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(t('submissionFailed'));
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <>
      {isFormSubmitted ? (
        <div className="bg-white p-4 rounded-lg">
          <p className="text-black-bold text-base mb-4">{t('formSubmitted')}</p>
          <div className="flex justify-center">
            <Button text={t('returnToMenu')} onClick={onReturnToMenu} />
          </div>
        </div>
      ) : (
        <FormBubble>
          <Formik
            initialValues={{
              date: '',
              err: '',
              state: '',
              locality: '',
              planned_activities: [],
              estimated_timeframe: '',
              additional_support: '',
              officer_name: '',
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-3 bg-white p-3 rounded-lg">
                <p className="text-3xl">{t('newProjectApplication')}</p>

                <div className="mb-3">
                  <label className="font-bold block text-base text-black-bold mb-1">{t('date')}</label>
                  <Field name="date" type="date" className="text-sm w-full p-2 border rounded-lg" disabled={isLoading} />
                </div>

                <div className="mb-3">
                  <label className="font-bold block text-base text-black-bold mb-1">{t('errId')}</label>
                  <Field name="err" type="text" className="text-sm w-full p-2 border rounded-lg" placeholder={t('enterErrId')} disabled={isLoading} />
                </div>

                <ActivitiesFieldArray optionsActivities={optionsActivities} optionsExpenses={optionsExpenses} />

                <div className="container py-4 px-4 mx-0 min-w-full flex flex-col items-center">
                  <Button
                    type="submit"
                    text={isLoading ? t('button.processing') : t('button.submit')}
                    disabled={isSubmitting || isLoading}
                  />
                </div>
              </Form>
            )}
          </Formik>
        </FormBubble>
      )}
    </>
  );
};

export default ProjectApplication;
