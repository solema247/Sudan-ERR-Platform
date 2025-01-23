
export default function getInitialValues(errId:number) {
    return {
        err_id: errId,      
        date: '',
        total_grant: '',
        total_other_sources: '',
        expenses: [
            {
                activity: '',
                description: '',
                payment_date: '',
                seller: '',
                payment_method: 'cash',
                receipt_no: '',
                amount: '',
                receiptFile: null,
            },
        ],
        excess_expenses: '',
        surplus_use: '',
        training: '',
        lessons: '',
        total_expenses: ''
    };
}