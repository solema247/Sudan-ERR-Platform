import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateSession } from '../../services/auth';

/**
 * Grant Calls API
 * 
 * Fetches available grant calls for the user's state
 * Only returns calls with status = 'open' that have allocations for the user's state
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Get the session from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        // Validate session and get user data
        const user = await validateSession(authHeader.replace('Bearer ', ''));
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            // Get user's state through the relationship: users -> emergency_rooms -> states
            const { data: userStateData, error: userStateError } = await newSupabase
                .from('users')
                .select(`
                    emergency_rooms!inner (
                        states!inner (
                            state_name
                        )
                    )
                `)
                .eq('id', user.id)
                .single();

            if (userStateError || !userStateData) {
                console.error('Error fetching user state:', userStateError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch user state',
                    error: userStateError?.message 
                });
            }

            const userState = userStateData.emergency_rooms.states.state_name;

            // Fetch available grant calls for the user's state
            const { data: grantCalls, error: grantCallsError } = await newSupabase
                .from('grant_call_state_allocations')
                .select(`
                    id,
                    amount,
                    grant_calls!inner (
                        id,
                        name,
                        shortname,
                        start_date,
                        end_date,
                        amount,
                        donors!inner (
                            name,
                            short_name
                        )
                    )
                `)
                .eq('state_name', userState)
                .eq('grant_calls.status', 'open');

            if (grantCallsError) {
                console.error('Error fetching grant calls:', grantCallsError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch grant calls',
                    error: grantCallsError.message 
                });
            }

            // Format the response
            const formattedGrantCalls = grantCalls.map(call => ({
                id: call.grant_calls.id,
                allocation_id: call.id,
                name: call.grant_calls.name,
                shortname: call.grant_calls.shortname,
                donor_name: call.grant_calls.donors.short_name || call.grant_calls.donors.name,
                state_amount: call.amount,
                total_amount: call.grant_calls.amount,
                start_date: call.grant_calls.start_date,
                end_date: call.grant_calls.end_date
            }));

            return res.status(200).json({
                success: true,
                grant_calls: formattedGrantCalls,
                user_state: userState
            });
        }

        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ success: false, message: 'Method not allowed' });

    } catch (error) {
        console.error('Grant calls API error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}
