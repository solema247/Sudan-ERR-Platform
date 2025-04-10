import { newSupabase } from "../../../../services/newSupabaseClient"

export const postImageRecordToDb = async (expenseId: string, imageUrl: string) => {
    console.log('Attempting to insert receipt record:', { expenseId, imageUrl });
    
    const { error } = await newSupabase
        .from('receipts')
        .insert({
            'expense_id': expenseId,
            'image_url': imageUrl,
            'created_at': new Date().toISOString()
        });

    if (error) {
        console.error('Error inserting receipt record:', error);
        throw error;
    } else {
        console.log('Receipt record inserted successfully');
    }
}