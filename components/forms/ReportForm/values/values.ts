
export default function getInitialValues(errId:string) {
    return {
        err_id: errId,      
        date: '',
        total_grant: 0,
        total_other_sources: 0,
        expenses: [
            {
                activity: '',
                description: '',
                payment_date: '',
                seller: '',
                payment_method: 'cash',
                receipt_no: '',
                amount: 0,
                receiptFiles: null,
            },
        ],
        excess_expenses: '',
        supporting_files: '',
        surplus_use: '',
        training: '',
        lessons: '',
        total_expenses: 0,
        supportingFiles: null
    };
}