import { supabase } from "../../../../services/supabaseClient"


export const postImageRecordToDb = async (path: string, parent_id: string, type: string) => {
    const { error } = await supabase
        .from('images')
        .insert({
            'parent_id': parent_id,
            'path': path,
            'type': type
        })
}