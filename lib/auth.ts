import jwt from 'jsonwebtoken';

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
