import React from "react";
import { Field, FieldArray } from "formik";
import { useTranslation } from "react-i18next";

const NewProjectActivities = ({ optionsActivities, optionsExpenses }) => {
  const { t } = useTranslation('projectApplication');
  
  return (
    <FieldArray name="planned_activities">
      {({ push, remove, form }) => (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold pt-4">{t('activities.header')}</h3>
          {form.values.planned_activities.map((activity, index) => (
            <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-md">
              <div className="mb-3">
                <label className="font-bold block text-sm mb-1">{t('activities.expenses.label')}</label>
                <Field
                  as="select"
                  name={`planned_activities[${index}].selectedActivity`}
                  className="text-sm w-full p-2 border rounded-lg"
                >
                  <option value="">{t('activities.expenses.placeholder')}</option>
                  {optionsActivities.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Field>
              </div>

              <div className="mb-3">
                <label className="font-bold block text-sm mb-1">{t('activities.expenses.quantity.label')}</label>
                <Field
                  name={`planned_activities[${index}].quantity`}
                  type="number"
                  className="text-sm w-full p-2 border rounded-lg"
                  placeholder={t('activities.expenses.quantity.placeholder')}
                />
              </div>

              <div className="mb-3">
                <label className="font-bold block text-sm mb-1">{t('activities.expenses.expenseLabel')}</label>
                <FieldArray name={`planned_activities[${index}].expenses`}>
                  {({ push, remove }) => (
                    <div className="space-y-2">
                      {activity.expenses.map((expense, expenseIndex) => (
                        <div key={expenseIndex} className="space-y-2">
                          <Field
                            as="select"
                            name={`planned_activities[${index}].expenses[${expenseIndex}].expense`}
                            className="text-sm w-full p-2 border rounded-lg"
                          >
                            <option value="">{t('activities.expenses.selectExpense')}</option>
                            {optionsExpenses.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Field>

                          <Field
                            name={`planned_activities[${index}].expenses[${expenseIndex}].description`}
                            type="text"
                            placeholder={t('activities.expenses.description')}
                            className="text-sm w-full p-2 border rounded-lg"
                          />
                          <Field
                            name={`planned_activities[${index}].expenses[${expenseIndex}].amount`}
                            type="number"
                            placeholder={t('activities.expenses.amount')}
                            className="text-sm w-full p-2 border rounded-lg"
                          />
                          <button
                            type="button"
                            className="text-red-500 font-bold"
                            onClick={() => remove(expenseIndex)}
                          >
                            {t('activities.expenses.remove')}
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-primaryGreen mt-2"
                        onClick={() => push({ expense: '', description: '', amount: '' })}
                      >
                        {t('activities.expenses.add')}
                      </button>
                    </div>
                  )}
                </FieldArray>
              </div>

              <button
                type="button"
                className="text-red-500 mt-2 font-bold"
                onClick={() => remove(index)}
              >
                {t('activities.remove')}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-primaryGreen mt-4 font-bold"
            onClick={() => push({ selectedActivity: '', quantity: '', expenses: [] })}
          >
            {t('activities.add')}
          </button>
        </div>
      )}
    </FieldArray>
  );
};

export default NewProjectActivities