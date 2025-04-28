import { v4 as uuidv4 } from 'uuid';

const getInitialValues = (errId: string, initialDraft?: any) => {
    if (initialDraft) {
        return {
            err_id: initialDraft.err_id || errId,
            date: initialDraft.report_date || '',
            total_grant: initialDraft.total_grant || 0,
            total_other_sources: initialDraft.total_other_sources || 0,
            excess_expenses: initialDraft.excess_expenses || '',
            surplus_use: initialDraft.surplus_use || '',
            lessons: initialDraft.lessons || '',
            training: initialDraft.training || '',
            total_expenses: initialDraft.total_expenses || 0,
            expenses: initialDraft.expenses?.map(expense => ({
                id: uuidv4(),
                activity: expense.activity,
                description: expense.description,
                amount: expense.amount,
                payment_date: expense.payment_date,
                payment_method: expense.payment_method,
                receipt_no: expense.receipt_no,
                seller: expense.seller
            })) || []
        };
    }

    return {
        err_id: errId,
        date: '',
        total_grant: 0,
        total_other_sources: 0,
        excess_expenses: '',
        surplus_use: '',
        lessons: '',
        training: '',
        total_expenses: 0,
        expenses: []
    };
};

export default getInitialValues;