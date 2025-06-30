import React from "react";
import { Field, FieldArray } from "formik";
import { useTranslation } from "react-i18next";
import Button from "../../ui/Button";
import { PlusCircleIcon, MinusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

const NewProjectActivities = ({ optionsActivities, optionsExpenses }) => {
  const { t } = useTranslation('projectApplication');
  
  return (
    <FieldArray name="planned_activities">
      {({ push, remove, form }) => (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold pt-4">
            {t('activities.header')}
            <span className="text-red-500 ml-1">*</span>
          </h3>
          {form.values.planned_activities.map((activity, index) => (
            <div key={index} className="p-4 pt-12 bg-gray-100 rounded-lg shadow-md relative">
              <Button
                text=""
                onClick={() => remove(index)}
                icon={<TrashIcon className="w-5 h-5" />}
                variant="danger"
                className="absolute top-3 right-3 !p-2 !m-0"
              />
              <div className="mb-3">
                <label className="font-bold block text-sm mb-1">
                  {t('activities.info')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Field
                  as="select"
                  name={`planned_activities[${index}].selectedActivity`}
                  className="text-sm w-full p-2 border rounded-lg"
                >
                  <option value="">{t('activities.placeholder')}</option>
                  {optionsActivities.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Field>
                {form.touched.planned_activities?.[index]?.selectedActivity && 
                 form.errors.planned_activities?.[index]?.selectedActivity && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.errors.planned_activities[index].selectedActivity}
                  </div>
                )}
              </div>

              <div className="mb-3">
                {/* Quantity and Duration in one row - no label */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <Field
                      name={`planned_activities[${index}].quantity`}
                      type="number"
                      className="text-sm w-full p-2 border rounded-lg"
                      placeholder={t('quantity') + ' *'}
                    />
                    {form.touched.planned_activities?.[index]?.quantity && 
                     form.errors.planned_activities?.[index]?.quantity && (
                      <div className="text-red-500 text-sm mt-1">
                        {form.errors.planned_activities[index].quantity}
                      </div>
                    )}
                  </div>
                  <div>
                    <Field
                      name={`planned_activities[${index}].duration`}
                      type="number"
                      className="text-sm w-full p-2 border rounded-lg"
                      placeholder={t('activities.duration') + ' *'}
                    />
                    {form.touched.planned_activities?.[index]?.duration && 
                     form.errors.planned_activities?.[index]?.duration && (
                      <div className="text-red-500 text-sm mt-1">
                        {form.errors.planned_activities[index].duration}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                {/* Location - no label */}
                <Field
                  name={`planned_activities[${index}].location`}
                  type="text"
                  className="text-sm w-full p-2 border rounded-lg mb-3"
                  placeholder={t('activities.location') + ' *'}
                />
                {form.touched.planned_activities?.[index]?.location && 
                 form.errors.planned_activities?.[index]?.location && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.errors.planned_activities[index].location}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="font-bold block text-sm mb-1">{t('activities.expenses.label')}</label>
                <FieldArray name={`planned_activities[${index}].expenses`}>
                  {({ push: pushExpense, remove: removeExpense }) => (
                    <div className="space-y-2">
                      {activity.expenses && activity.expenses.map((expense, expenseIndex) => (
                        <div key={expenseIndex} className="space-y-2 p-3 border rounded-lg">
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

                          {/* Frequency and Unit Price in one row */}
                          <div className="grid grid-cols-2 gap-4">
                            <Field
                              name={`planned_activities[${index}].expenses[${expenseIndex}].frequency`}
                              type="number"
                              placeholder={t('frequency')}
                              className="text-sm w-full p-2 border rounded-lg"
                              onChange={(e) => {
                                const value = e.target.value;
                                const unitPrice = form.values.planned_activities[index].expenses[expenseIndex].unitPrice || 0;
                                form.setFieldValue(`planned_activities[${index}].expenses[${expenseIndex}].frequency`, value);
                                form.setFieldValue(
                                  `planned_activities[${index}].expenses[${expenseIndex}].total`,
                                  Number(value) * Number(unitPrice)
                                );
                              }}
                            />
                            <Field
                              name={`planned_activities[${index}].expenses[${expenseIndex}].unitPrice`}
                              type="number"
                              placeholder={t('unitPrice')}
                              className="text-sm w-full p-2 border rounded-lg"
                              onChange={(e) => {
                                const value = e.target.value;
                                const frequency = form.values.planned_activities[index].expenses[expenseIndex].frequency || 0;
                                form.setFieldValue(`planned_activities[${index}].expenses[${expenseIndex}].unitPrice`, value);
                                form.setFieldValue(
                                  `planned_activities[${index}].expenses[${expenseIndex}].total`,
                                  Number(frequency) * Number(value)
                                );
                              }}
                            />
                          </div>

                          {/* Total (Read-only) */}
                          <Field
                            name={`planned_activities[${index}].expenses[${expenseIndex}].total`}
                            type="number"
                            placeholder={t('total')}
                            className="text-sm w-full p-2 border rounded-lg bg-gray-50"
                            disabled
                          />

                          <div className="flex justify-end space-x-2 mt-2">
                            <Button
                              text=""
                              onClick={() => pushExpense({ 
                                expense: '', 
                                description: '', 
                                frequency: '',
                                unitPrice: '',
                                total: ''
                              })}
                              icon={<PlusCircleIcon className="w-5 h-5" />}
                              className="text-sm"
                            />
                            <Button
                              text=""
                              onClick={() => removeExpense(expenseIndex)}
                              icon={<MinusCircleIcon className="w-5 h-5" />}
                              variant="danger"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      ))}
                      {(!activity.expenses || activity.expenses.length === 0) && (
                        <Button
                          text={t('activities.expenses.add')}
                          onClick={() => pushExpense({ 
                            expense: '', 
                            description: '', 
                            frequency: '',
                            unitPrice: '',
                            total: ''
                          })}
                          icon={<PlusCircleIcon className="w-5 h-5" />}
                          className="text-sm"
                        />
                      )}
                    </div>
                  )}
                </FieldArray>
              </div>
            </div>
          ))}
          <Button
            text={t('activities.add')}
            onClick={() => push({ 
              selectedActivity: '', 
              quantity: '',
              duration: '',
              location: '',
              expenses: []
            })}
            className="w-full"
          />
        </div>
      )}
    </FieldArray>
  );
};

export default NewProjectActivities