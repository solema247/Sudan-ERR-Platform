import { useState } from 'react';
import { Field, ErrorMessage, useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Check } from "lucide-react";
import { UploadChooser, reportUploadType } from './upload/UploadChooser';


export interface ActivityOption {
    id: string,
    name: string
}

interface ExpenseCardProps {
    expense: any,
    index: number,
    arrayHelpers: any,
    categories: any,
}

const ExpenseCard = ({ expense, index, arrayHelpers, categories }: ExpenseCardProps) => {
    const { t } = useTranslation('fillForm');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { values, setFieldValue } = useFormikContext();

    return (
            <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-md mt-3 mb-3">
            {!isCollapsed ? (
                <>
                    <div className="mb-3">
                        <label htmlFor={`expenses[${index}].activity`} className="font-bold block text-base text-black-bold mb-1">
                            {t('activity')}
                        </label>
                        <Field
                            name={`expenses[${index}].activity`}
                            as="select"
                            className="text-sm w-full p-2 border rounded-lg mb-3"
                        >
                            {categories?.map((activityOption) => (
                                <option key={activityOption.id} value={activityOption.id}>
                                    {activityOption.name}
                                </option>
                            ))}
                        </Field>
                        <ErrorMessage name={`expenses[${index}].activity`} component="div" />
                    </div>

                    <div className="mb-3">
                        <label htmlFor={`expenses[${index}].description`} className="font-bold block text-base text-black-bold mb-1">
                            {t('description')}
                        </label>
                        <Field
                            name={`expenses[${index}].description`}
                            type="text"
                            placeholder="Description"
                            className="text-sm w-full p-2 border rounded-lg"
                        />
                        <ErrorMessage name={`expenses[${index}].description`} component="div" />
                    </div>

                    <div className="mb-3">
                        <label htmlFor={`expenses[${index}].payment_date`} className="font-bold block text-base text-black-bold mb-1">
                            {t('paymentDate')}
                        </label>
                        <Field
                            name={`expenses[${index}].payment_date`}
                            type="date"
                            className="text-sm w-full p-2 border rounded-lg"
                        />
                        <ErrorMessage name={`expenses[${index}].payment_date`} component="div" />
                    </div>

                    <div className="mb-3">
                        <label htmlFor={`expenses[${index}].seller`} className="font-bold block text-base text-black-bold mb-1">
                            {t('seller')}
                        </label>
                        <Field
                            name={`expenses[${index}].seller`}
                            type="text"
                            placeholder="Seller"
                            className="text-sm w-full p-2 border rounded-lg"
                        />
                        <ErrorMessage name={`expenses[${index}].seller`} component="div" />
                    </div>

                    <div className="mb-3">
                        <label htmlFor={`expenses[${index}].payment_method`} className="font-bold block text-base text-black-bold mb-1">
                            {t('paymentMethod')}
                        </label>
                        <Field
                            name={`expenses[${index}].payment_method`}
                            as="select"
                        >
                            <option value="cash">{t('cash')}</option>
                            <option value="credit">{t('credit')}</option>
                            <option value="debit">{t('debit')}</option>
                        </Field>
                        <ErrorMessage name={`expenses[${index}].payment_method`} component="div" />
                    </div>

                    <div className="mb-3">
                        <label htmlFor={`expenses[${index}].receipt_no`} className="font-bold block text-base text-black-bold mb-1">
                            {t('receiptNo')}
                        </label>
                        <Field
                            name={`expenses[${index}].receipt_no`}
                            type="text"
                            placeholder="Receipt No."
                            className="text-sm w-full p-2 border rounded-lg"
                        />
                        <ErrorMessage name={`expenses[${index}].receipt_no`} component="div" />
                    </div>

                    <div className="mb-3">
                        <label htmlFor={`expenses[${index}].amount`} className="font-bold block text-base text-black-bold mb-1">
                            {t('amount')}
                        </label>
                        <Field
                            name={`expenses[${index}].amount`}
                            type="number"
                            className="text-sm w-full p-2 border rounded-lg"
                        />
                        <ErrorMessage name={`expenses[${index}].amount`} component="div" />
                    </div>

                    <UploadChooser
                        key={`${reportUploadType.RECEIPT.toString}-${index}-${Math.random()}}`}
                        uploadType = {reportUploadType.RECEIPT}
                        projectId = ""
                        reportId = ""
                    />

                    <div className="flex justify-between content-center">
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(true)}
                        >
                            <div className="flex content-center">
                              <Check/>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => arrayHelpers.remove(index)}
                        >
                            <div className="flex content-center text-red-500">
                                <Trash2/>
                            </div>
                        </button>
                    </div>
                    </>
            ) : (
                <div className="flex flex-row justify-between">
                    <span>
                        <p><span className="font-bold">Activity:&nbsp;</span>
                        {expense.activity}</p>

                        <p><span className="font-bold">Amount:&nbsp;</span>
                        5000
                        </p>
                    </span>

                    <button
                        type="button"
                        className="font-bold text-blue-500"
                        onClick={() => setIsCollapsed(false)}
                    >
                       <Pencil/>
                    </button>
                </div>
            )}
            </div>
    );
};

export default ExpenseCard;
