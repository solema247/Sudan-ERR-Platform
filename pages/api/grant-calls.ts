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

            console.log('User state data:', JSON.stringify(userStateData, null, 2));
            
            // Extract user state with proper error handling
            let userState;
            try {
                // Based on the debug output, emergency_rooms is an object, not an array
                const emergencyRooms = userStateData.emergency_rooms as any;
                if (emergencyRooms && emergencyRooms.states) {
                    userState = emergencyRooms.states.state_name;
                }
            } catch (error) {
                console.error('Error extracting user state:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error extracting user state',
                    error: error.message
                });
            }

            // First, get the latest decision_no for each grant call
            const { data: latestDecisions, error: decisionsError } = await newSupabase
                .from('grant_call_state_allocations')
                .select('grant_call_id, decision_no')
                .eq('state_name', userState)
                .order('decision_no', { ascending: false });

            if (decisionsError) {
                console.error('Error fetching latest decisions:', decisionsError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch latest decisions',
                    error: decisionsError.message 
                });
            }

            console.log('Latest decisions:', JSON.stringify(latestDecisions, null, 2));

            // Group by grant_call_id and get the max decision_no for each
            const maxDecisionsByGrantCall = latestDecisions.reduce((acc, item) => {
                if (!acc[item.grant_call_id] || item.decision_no > acc[item.grant_call_id]) {
                    acc[item.grant_call_id] = item.decision_no;
                }
                return acc;
            }, {});

            // Fetch available grant calls for the user's state with only the latest decision_no
            const { data: grantCalls, error: grantCallsError } = await newSupabase
                .from('grant_call_state_allocations')
                .select(`
                    id,
                    amount,
                    decision_no,
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
                .eq('grant_calls.status', 'open')
                .in('grant_call_id', Object.keys(maxDecisionsByGrantCall));

            if (grantCallsError) {
                console.error('Error fetching grant calls:', grantCallsError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch grant calls',
                    error: grantCallsError.message 
                });
            }

            console.log('Grant calls count:', grantCalls.length);
            console.log('Max decisions:', maxDecisionsByGrantCall);
            console.log('Sample grant call:', JSON.stringify(grantCalls[0], null, 2));
            console.log('Grant calls query result:', JSON.stringify(grantCalls, null, 2));

            // Filter to only include allocations with the latest decision_no for each grant call
            const filteredGrantCalls = grantCalls.filter(call => {
                try {
                    const grantCall = call.grant_calls as any;
                    const grantCallId = grantCall ? grantCall.id : null;
                    const maxDecision = maxDecisionsByGrantCall[grantCallId];
                    return call.decision_no === maxDecision;
                } catch (error) {
                    console.error('Error filtering grant call:', error, call);
                    return false;
                }
            });

            // Format the response with error handling
            const formattedGrantCalls = filteredGrantCalls.map(call => {
                try {
                    const grantCall = call.grant_calls as any;
                    const donor = grantCall && grantCall.donors ? grantCall.donors : null;
                    
                    if (!grantCall) {
                        console.error('Missing grant call data:', call);
                        return null;
                    }
                    
                    return {
                        id: grantCall.id,
                        allocation_id: call.id,
                        name: grantCall.name,
                        shortname: grantCall.shortname,
                        donor_name: donor ? (donor.short_name || donor.name) : 'Unknown Donor',
                        state_amount: call.amount,
                        total_amount: grantCall.amount,
                        start_date: grantCall.start_date,
                        end_date: grantCall.end_date
                    };
                } catch (error) {
                    console.error('Error formatting grant call:', error, call);
                    return null;
                }
            }).filter(Boolean);

            console.log('Filtered grant calls count:', filteredGrantCalls.length);
            console.log('Formatted grant calls:', JSON.stringify(formattedGrantCalls, null, 2));

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
