import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';

export default function getValidationScheme() {
    const { t } = useTranslation('fillForm');
    const ERROR_MESSAGE_FIELD_REQUIRED = "هذه الخانة مطلوبه.";
    const ERROR_MESSAGE_INVALID_NUMBER = "هذا الرقم غير صالح.";

    const expenseSchema = Yup.object().shape({
        activity: Yup.string().required(t('errorMessages.required')),
        description: Yup.string().required(t('errorMessages.required')),
        payment_date: Yup.string().required(t('errorMessages.required')),
        seller: Yup.string().required(t('errorMessages.required')),
        payment_method: Yup.string().required(t('errorMessages.required')),
        receipt_no: Yup.string().required(t('errorMessages.required')),
        amount: Yup.number().required(t('errorMessages.required')).min(0, t('errorMessages.invalidNumber')),
    });

    return Yup.object({
        err_id: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
        date: Yup.string().required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED),
        total_grant: Yup.number()
            .required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED)
            .min(0, t('errorMessages.invalidNumber') || ERROR_MESSAGE_INVALID_NUMBER),
        total_other_sources: Yup.number()
            .required(t('errorMessages.required') || ERROR_MESSAGE_FIELD_REQUIRED)
            .min(0, t('errorMessages.invalidNumber') || ERROR_MESSAGE_INVALID_NUMBER),
        excess_expenses: Yup.string(),
        surplus_use: Yup.string(),
        training: Yup.string(),
        expenses: Yup.array()
            .of(expenseSchema)
            .min(1, t('errorMessages.minExpenses')),
        })
}
