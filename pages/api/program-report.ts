import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateJWT } from '../../services/auth';

// API endpoint for program report submission
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    const user = validateJWT(token);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      project_id,
      report_date,
      positive_changes,
      negative_results,
      unexpected_results,
      lessons_learned,
      suggestions,
      reporting_person,
      activities
    } = req.body;

    // Insert main report
    const { data: reportData, error: reportError } = await newSupabase
      .from('err_program_report')
      .insert({
        project_id,
        report_date,
        positive_changes,
        negative_results,
        unexpected_results,
        lessons_learned,
        suggestions,
        reporting_person
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Insert activities with reach data
    const reachData = activities.map(activity => ({
      report_id: reportData.id,
      ...activity
    }));

    const { error: reachError } = await newSupabase
      .from('err_program_reach')
      .insert(reachData);

    if (reachError) throw reachError;

    res.status(200).json({ 
      success: true, 
      message: 'Report submitted successfully',
      report_id: reportData.id 
    });

  } catch (error) {
    console.error('Error submitting program report:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error submitting report' 
    });
  }
} 