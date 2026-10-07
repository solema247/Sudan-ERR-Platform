// Who may use the ERR app. Partners use the partner portal, not this app.
export const APP_ROLES = ['base_err', 'state_err', 'support', 'admin', 'superadmin'] as const;

export type AppAccess = 'ok' | 'pending' | 'no_access';

/** Decide whether a user profile may use the app. */
export function appAccess(user: { role?: string | null; status?: string | null } | null | undefined): AppAccess {
    if (!user) return 'no_access';
    if (!APP_ROLES.includes((user.role || '') as typeof APP_ROLES[number])) return 'no_access';
    if (user.status === 'active') return 'ok';
    if (user.status === 'pending') return 'pending';
    return 'no_access'; // suspended, deleted, or anything else
}
