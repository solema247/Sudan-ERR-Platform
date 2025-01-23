import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import ReceiptChooser from './ReceiptUploader';
import { useTranslation } from 'react-i18next';

const ExpenseCard = ({ expense, index, arrayHelpers }) => {
    const { t } = useTranslation('fill-form');

    return (
        <div key={index} >
            <label htmlFor={`expenses[${index}].activity`} className="font-bold block text-base text-black-bold mb-1">
            {t('excessExpenses')}
            </label>
            <Field
                name={`expenses[${index}].activity`}
                type="text"
                placeholder="Activity"
            />

            <label htmlFor={`expenses[${index}].description`} className="font-bold block text-base text-black-bold mb-1">
            {t('description')}
            </label>
            <Field
                name={`expenses[${index}].description`}
                type="text"
                placeholder="Description"
            />

            <label htmlFor={`expenses[${index}].payment_date`} className="font-bold block text-base text-black-bold mb-1">
                 {t('paymentDate')}
            </label>
            <Field
                name={`expenses[${index}].payment_date`}
                type="date"
            />
            
            <label htmlFor={`expenses[${index}].seller`} className="font-bold block text-base text-black-bold mb-1">
                 {t('seller')}
            </label>
            <Field
                name={`expenses[${index}].seller`}
                type="text"
                placeholder="Seller"
            />
            
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

            <label htmlFor={`expenses[${index}].receipt_no`} className="font-bold block text-base text-black-bold mb-1">
            {t('receiptNo')}
            </label>
            <Field
                name={`expenses[${index}].receipt_no`}
                type="text"
                placeholder="Receipt No."
            />
            
            <label htmlFor={`expenses[${index}].amount`} className="font-bold block text-base text-black-bold mb-1">
                 {t('amount')}
            </label>
            <Field
                name={`expenses[${index}].amount`}
                type="number"
                placeholder="Amount"
            />

            <label htmlFor={`expenses[${index}].receiptFile`} className="font-bold block text-base text-black-bold mb-1">
                 {t('receiptFile')}
            </label>
            <Field
                name={`expenses[${index}].receiptFile`}
                type="file"
            />
            
            <label htmlFor="excess_expenses" className="font-bold block text-base text-black-bold mb-1">
                 {t('excessExpenses')}
            </label>

            <ReceiptChooser
                onFileSelect={(file) => arrayHelpers.setFieldValue(`expenses.${index}.file`, file)}
                onError={(error) => alert(error)}
            />

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