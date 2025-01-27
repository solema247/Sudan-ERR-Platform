import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import ReceiptChooser from './ReceiptUploader';
import { useTranslation } from 'react-i18next';


/**
 * 
                activity: '',
                description: '',
                payment_date: '',
                seller: '',
                payment_method: 'cash',
                receipt_no: '',
                amount: '',
                receiptFile: null,
            }
 */

    const ExpenseCard = ({ expense, index, arrayHelpers }) => {
    const { t } = useTranslation('fill-form');

    return (
        <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-md">
            <label htmlFor={`expenses[${index}].activity`} className="font-bold block text-base text-black-bold mb-1">
            {t('activity')}
            </label>
            <Field
                name={`expenses[${index}].activity`}
                type="text"
                placeholder="Activity"
                className="text-sm w-full p-2 border rounded-lg"
            />

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
            
            <label htmlFor={`expenses[${index}].payment_date`} className="font-bold block text-base text-black-bold mb-1">
                 {t('paymentDate')}
            </label>
            <Field
                name={`expenses[${index}].payment_date`}
                type="date"
                className="text-sm w-full p-2 border rounded-lg"
            />
            <ErrorMessage name={`expenses[${index}].payment_date`} component="div" />

            
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

            
            <label htmlFor={`expenses[${index}].payment_method`} className="font-bold block text-base text-black-bold mb-1">
                 {t('paymentMethod')}
            </label>
            <Field
                name={`expenses[${index}].payment_method`}
                as="select"
            >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
            </Field>
            <ErrorMessage name={`expenses[${index}].payment_method`} component="div" />


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

            
            <label htmlFor={`expenses[${index}].amount`} className="font-bold block text-base text-black-bold mb-1">
                 {t('amount')}
            </label>
            <Field
                name={`expenses[${index}].amount`}
                type="number"
                placeholder="Amount"
                className="text-sm w-full p-2 border rounded-lg"
            />
            <ErrorMessage name={`expenses[${index}].amount`} component="div" />


            <label htmlFor={`expenses[${index}].receiptFile`} className="font-bold block text-base text-black-bold mb-1">
                 {t('receiptFile')}
            </label>
            <Field
                name={`expenses[${index}].receiptFile`}
                type="file"
                className="text-sm w-full p-2 border rounded-lg"
            />
            <ErrorMessage name={`expenses[${index}].receiptFile`} component="div" />

        
            <button
                type="button"
                className="text-red-500 mt-2 font-bold"
                onClick={() => arrayHelpers.remove(index)}
            >
                {t('remove')}
            </button>
        </div>
            )

           
}

export default ExpenseCard