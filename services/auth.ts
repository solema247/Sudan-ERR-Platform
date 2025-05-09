//lib/auth.ts
import jwt from 'jsonwebtoken';
import { newSupabase } from './newSupabaseClient';

/**
 * Generate tokens used for user logins
 */

const SECRET_KEY = process.env.JWT_SECRET_KEY; // Secret key from environment variables

if (!SECRET_KEY) {
    throw new Error('JWT_SECRET_KEY is not defined in environment variables');
}

/**
 * Generate a JWT token
 * @param payload - Data to encode in the token (e.g., user details)
 * @param expiresIn - Expiration time (default: '1h')
 * @returns Signed JWT
 */
export const generateToken = (payload: object, expiresIn = '1h') => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
};


/**
 * Validate and decode a JWT token
 * @param token - JWT to validate
 * @returns Decoded payload if valid, otherwise null
 */
export const validateJWT = (token: string) => {
    try {
        return jwt.verify(token, SECRET_KEY); // Verifies and decodes the token
    } catch (error) {
        return null; // Return null if token is invalid or expired
    }
};

/**
 * Decode a JWT without validation (useful for debugging)
 * @param token - JWT to decode
 * @returns Decoded payload
 */
export const decodeJWT = (token: string) => {
    return jwt.decode(token); // Decode without validation
};

/**
 * Validate a Supabase session token
 * @param token - Supabase session token to validate
 * @returns User data if valid, null otherwise
 */
export const validateSession = async (token: string) => {
    try {
        const { data: { user }, error } = await newSupabase.auth.getUser(token);
        
        if (error || !user) {
            return null;
        }

        // Get additional user data from our users table
        const { data: userData, error: userError } = await newSupabase
            .from('users')
            .select('role, status, display_name, err_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return null;
        }

        // Only return data if user is active
        if (userData.status !== 'active') {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            err_id: userData.err_id,
            role: userData.role,
            status: userData.status,
            display_name: userData.display_name
        };
    } catch (error) {
        console.error('Session validation error:', error);
        return null;
    }
};

/**
 * Get current session
 * @returns Current session if exists, null otherwise
 */
export const getCurrentSession = async () => {
    try {
        const { data: { session }, error } = await newSupabase.auth.getSession();
        if (error || !session) {
            return null;
        }
        return session;
    } catch (error) {
        console.error('Get session error:', error);
        return null;
    }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
    try {
        const { error } = await newSupabase.auth.signOut();
        if (error) {
            console.error('Sign out error:', error);
        }
    } catch (error) {
        console.error('Sign out error:', error);
    }
};
