import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import Button from '../../ui/Button';
import FormBubble from '../../cosmetic/FormBubble';
import ActivitiesFieldArray from './NewProjectActivities';

const NewProjectApplication = ({ onReturnToMenu }) => {
    type Dictionary<T> = {
        [key: string]: T;
    };

  const { t, i18n } = useTranslation('projectApplication');
  const [statesAndLocalities, setStatesAndLocalities] = useState({ states: [], localities: [] })
  const [optionsActivities, setOptionsActivities] = useState([]);
  const [optionsExpenses, setOptionsExpenses] = useState([]);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isLoading, setLoading] = useState(false);

  interface StateLocalityPair {
    state_name: string;
    locality: string;
  }

  useEffect(() => {
    /**
     * Fetches Select options for activities, expenses and localities (which are based on what state you have selected.)
     * 
     * TODO: Prevent redundant fetches of data we already have
     */

    const fetchOptions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/project-application?language=${i18n.language}`);
        if (res.ok) {
          const data = await res.json();

          const uniqueStateNames = data
          .map(state => state.state_name)
          .filter((state, index, self) => self.indexOf(state) === index);
      
          const stateAndLocalityPairs: StateLocalityPair[] = data.states;

        setOptionsActivities(data.plannedActivities.map(({ id, name }) => ({ value: id, label: t(name) })));
        setOptionsExpenses(data.expenseCategories.map(({ id, name }) => ({ value: id, label: t(name) })));
        setStatesAndLocalities({ states: uniqueStateNames, localities: stateAndLocalityPairs });
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
        duration: Yup.string().required(t('validation.required')),
        placeOfOperation: Yup.string().required(t('validation.required')),
        expenses: Yup.array().of(
          Yup.object({
            selectedExpense: Yup.string().required(t('validation.required')),
            description: Yup.string().required(t('validation.required')),
            amount: Yup.number().required(t('validation.required')),
          })
        ),
      })
    ),
    estimated_timeframe: Yup.string().required(t('validation.required')),
    additional_support: Yup.string(),
    officer_name: Yup.string().required(t('validation.required')),
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
            {({ isSubmitting, values }) => (
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

                <div className="mb-3">
                  <label className="font-bold block text-base text-black-bold mb-1">{t('state')}</label>
                  <Field name="state" as="select" className="text-sm w-full p-2 border rounded-lg" disabled={isLoading}>
                    <option value="">{t('selectState')}</option>
                    {
                        values.state ?

                        statesAndLocalities[values.state]
                            .map((item) => (
                              <option key={item.locality} value={item.locality}>
                                {item.locality}
                              </option>
                            ))
                    }
                  </Field>
                </div>

                <div className="mb-3">
                  <label className="font-bold block text-base text-black-bold mb-1">{t('locality')}</label>
                  <Field name="locality" as="select" className="text-sm w-full p-2 border rounded-lg" disabled={isLoading}>
                    <option value="">{t('selectLocality')}</option>


                    {statesAndLocalities.localities.map((locality) => (
                      <option key={locality} value={locality}>
                        {locality}
                      </option>
                    ))}
                  </Field>
                </div>

                <ActivitiesFieldArray optionsActivities={optionsActivities} optionsExpenses={optionsExpenses} />

                <div className="mb-3">
                  <label className="font-bold block text-base text-black-bold mb-1">{t('estimatedTimeframe')}</label>
                  <Field
                    as="textarea"
                    name="estimated_timeframe"
                    className="text-sm w-full p-2 border rounded-lg"
                    placeholder={t('enterEstimatedTimeframe')}
                    disabled={isLoading}
                  />
                </div>

                <div className="mb-3">
                  <label className="font-bold block text-base text-black-bold mb-1">{t('additionalSupport')}</label>
                  <Field
                    as="textarea"
                    name="additional_support"
                    className="text-sm w-full p-2 border rounded-lg"
                    placeholder={t('enterAdditionalSupport')}
                    disabled={isLoading}
                  />
                </div>

                <div className="mb-3">
                  <label className="font-bold block text-base text-black-bold mb-1">{t('officerName')}</label>
                  <Field
                    name="officer_name"
                    type="text"
                    className="text-sm w-full p-2 border rounded-lg"
                    placeholder={t('enterOfficerName')}
                    disabled={isLoading}
                  />
                </div>

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

export default NewProjectApplication;
