import React from "react";
import { Field, FieldArray } from "formik";
import { useTranslation } from "react-i18next";
import Button from "../../ui/Button";
import { PlusCircleIcon, MinusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

const FIELD = 'app-input !py-2 text-sm';

const NewProjectActivities = ({ optionsActivities, optionsExpenses }) => {
  const { t } = useTranslation('project-application');
  
  return (
    <FieldArray name="planned_activities">
      {({ push, remove, form }) => (
        <div className="space-y-2.5">
          <h3 className="text-sm font-bold pt-1 text-white">
            {t('activities.header')}
            <span className="text-brand-orange ml-1">*</span>
          </h3>
          {form.values.planned_activities.map((activity, index) => (
            <div key={index} className="p-3 pt-10 rounded-xl bg-[#1c2d48] border border-white/10 relative">
              <Button
                text=""
                onClick={() => remove(index)}
                icon={<TrashIcon className="w-4 h-4" />}
                variant="danger"
                className="absolute top-2 right-2 !p-1.5 !m-0 !rounded-lg"
              />
              <div className="mb-2">
                <label className="font-semibold block text-xs text-[#a8b6cc] mb-1">
                  {t('activities.info')}
                  <span className="text-brand-orange ml-0.5">*</span>
                </label>
                <Field
                  as="select"
                  name={`planned_activities[${index}].selectedActivity`}
                  className={FIELD}
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
                  <div className="text-red-300 text-xs mt-0.5">
                    {form.errors.planned_activities[index].selectedActivity}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <Field
                  name={`planned_activities[${index}].quantity`}
                  type="number"
                  className={FIELD}
                  placeholder={t('quantity') + ' *'}
                />
                <Field
                  name={`planned_activities[${index}].duration`}
                  type="number"
                  className={FIELD}
                  placeholder={t('activities.duration') + ' *'}
                />
                <Field
                  name={`planned_activities[${index}].location`}
                  type="text"
                  className={FIELD}
                  placeholder={t('activities.location') + ' *'}
                />
              </div>

              <div>
                <label className="font-semibold block text-xs text-[#a8b6cc] mb-1">{t('activities.expenses.label')}</label>
                <FieldArray name={`planned_activities[${index}].expenses`}>
                  {({ push: pushExpense, remove: removeExpense }) => (
                    <div className="space-y-1.5">
                      {activity.expenses && activity.expenses.map((expense, expenseIndex) => (
                        <div key={expenseIndex} className="space-y-1.5 p-2 rounded-lg border border-white/10 bg-[#152238]">
                          <Field
                            as="select"
                            name={`planned_activities[${index}].expenses[${expenseIndex}].expense`}
                            className={FIELD}
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
                            className={FIELD}
                          />

                          <div className="grid grid-cols-3 gap-1.5">
                            <Field
                              name={`planned_activities[${index}].expenses[${expenseIndex}].frequency`}
                              type="number"
                              placeholder={t('frequency')}
                              className={FIELD}
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
                              className={FIELD}
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
                            <Field
                              name={`planned_activities[${index}].expenses[${expenseIndex}].total`}
                              type="number"
                              placeholder={t('total')}
                              className={`${FIELD} bg-[#1c2d48]`}
                              disabled
                            />
                          </div>

                          <div className="flex justify-end gap-1.5">
                            <Button
                              text=""
                              onClick={() => pushExpense({ 
                                expense: '', 
                                description: '', 
                                frequency: '',
                                unitPrice: '',
                                total: ''
                              })}
                              icon={<PlusCircleIcon className="w-4 h-4" />}
                              className="!m-0 !p-1.5 !rounded-lg !bg-[#1c2d48] !text-white border border-white/10 text-xs"
                            />
                            <Button
                              text=""
                              onClick={() => removeExpense(expenseIndex)}
                              icon={<MinusCircleIcon className="w-4 h-4" />}
                              variant="danger"
                              className="!m-0 !p-1.5 !rounded-lg text-xs"
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
                          icon={<PlusCircleIcon className="w-4 h-4" />}
                          className="!m-0 !py-1.5 !rounded-lg !bg-[#152238] !text-white border border-white/10 text-xs"
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
            className="!m-0 w-full !py-2 !rounded-xl !bg-[#1c2d48] !text-white border border-white/10 text-sm"
          />
        </div>
      )}
    </FieldArray>
  );
};

export default NewProjectActivities;
