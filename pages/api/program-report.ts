import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateJWT } from '../../services/auth';

// API endpoint for program report submission
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get token from cookies
    const token = req.cookies.token;
    
    // Validate session
    const user = validateJWT(token);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Please log in again' 
      });
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
      activities,
      draft_id
    } = req.body;

    // If this was a draft, delete the draft records first
    if (draft_id) {
      // Delete draft summary
      const { error: deleteSummaryError } = await newSupabase
        .from('err_program_report')
        .delete()
        .eq('id', draft_id)
        .eq('is_draft', true);

      if (deleteSummaryError) throw deleteSummaryError;

      // Delete draft activities
      const { error: deleteActivitiesError } = await newSupabase
        .from('err_program_reach')
        .delete()
        .eq('report_id', draft_id)
        .eq('is_draft', true);

      if (deleteActivitiesError) throw deleteActivitiesError;
    }

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
        reporting_person,
        is_draft: false
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Insert activities with reach data
    const reachData = activities.map(activity => ({
      report_id: reportData.id,
      activity_name: activity.activity_name,
      activity_goal: activity.activity_goal,
      location: activity.location,
      start_date: activity.start_date,
      end_date: activity.end_date,
      individual_count: activity.individual_count,
      household_count: activity.household_count,
      male_count: activity.male_count,
      female_count: activity.female_count,
      under18_male: activity.under18_male,
      under18_female: activity.under18_female,
      is_draft: false
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