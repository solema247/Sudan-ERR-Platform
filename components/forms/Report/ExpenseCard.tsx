import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import ReceiptChooser from './ReceiptUploader';
import { useTranslation } from 'react-i18next';

const ExpenseCard = ({ expense, index, arrayHelpers }) => {
    const { t } = useTranslation('fill-form');

    return (
        <div key={index} >
            <Field
                name={`expenses[${index}].activity`}
                type="text"
                placeholder="Activity"
            />
            <Field
                name={`expenses[${index}].description`}
                type="text"
                placeholder="Description"
            />
            <Field
                name={`expenses[${index}].payment_date`}
                type="date"
            />
            <Field
                name={`expenses[${index}].seller`}
                type="text"
                placeholder="Seller"
            />
            <Field
                name={`expenses[${index}].payment_method`}
                as="select"
            >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
            </Field>
            <Field
                name={`expenses[${index}].receipt_no`}
                type="text"
                placeholder="Receipt No."
            />
            <Field
                name={`expenses[${index}].amount`}
                type="number"
                placeholder="Amount"
            />
            <Field
                name={`expenses[${index}].receiptFile`}
                type="file"
            />
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