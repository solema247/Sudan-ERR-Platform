
export default function getInitialValues(errId:string) {
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
                receiptFiles: null,
            },
        ],
        excess_expenses: '',
        supporting_files: '',
        surplus_use: '',
        training: '',
        lessons: '',
        total_expenses: '',
        supportingFiles: null
    };
}