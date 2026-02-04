import type { Task, TaskState, Urgency } from './types';

/**
 * State priority for sorting (lower = higher priority)
 */
const STATE_PRIORITY: Record<TaskState, number> = {
    in_progress: 1,  // Always at top
    paused: 2,       // Second
    requested: 3,    // Third
    completed: 4,    // Archive only
    rejected: 5,     // Hidden after 1hr
};

/**
 * Urgency durations in milliseconds
 */
const URGENCY_DURATION_MS: Record<Urgency, number> = {
    'now': 0,
    '15min': 15 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    'today': 24 * 60 * 60 * 1000,
};

/**
 * Stale threshold: 2 hours in milliseconds
 */
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

/**
 * Sort tasks by State-First, then Deadline
 * Priority: In Progress > Paused > Requested
 * Within same state: earlier deadline first
 */
export function sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
        // 1. Compare by state priority first
        const stateDiff = STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state];
        if (stateDiff !== 0) return stateDiff;

        // 2. Tie-breaker: earlier deadline wins
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
}

/**
 * Calculate deadline from creation time and urgency
 */
export function calculateDeadline(createdAt: Date | string, urgency: Urgency): Date {
    const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
    const duration = URGENCY_DURATION_MS[urgency] ?? 0;
    return new Date(created.getTime() + duration);
}

/**
 * Check if a task is stale (in progress for >2 hours)
 */
export function isTaskStale(stateChangedAt: string | Date): boolean {
    const changed = stateChangedAt instanceof Date ? stateChangedAt : new Date(stateChangedAt);
    const elapsed = Date.now() - changed.getTime();
    return elapsed > STALE_THRESHOLD_MS;
}

/**
 * Format initials with auto-dot insertion
 * Input: "JD" or "jd" or "J.D" 
 * Output: "J.D"
 */
export function formatInitials(input: string): string {
    // Remove any existing dots and spaces, uppercase
    const clean = input.replace(/[.\s]/g, '').toUpperCase();

    // Take only first 2 characters
    const chars = clean.slice(0, 2);

    if (chars.length === 0) return '';
    if (chars.length === 1) return chars;

    // Insert dot between characters
    return `${chars[0]}.${chars[1]}`;
}

/**
 * Validate initials input (2 letters only)
 */
export function validateInitials(input: string): { valid: boolean; error?: string } {
    const clean = input.replace(/[.\s]/g, '');

    if (clean.length === 0) {
        return { valid: false, error: 'Initials required' };
    }

    if (clean.length !== 2) {
        return { valid: false, error: 'Must be exactly 2 letters' };
    }

    if (!/^[A-Za-z]{2}$/.test(clean)) {
        return { valid: false, error: 'Letters only' };
    }

    return { valid: true };
}

/**
 * Format relative time (e.g., "2 hours ago", "in 15 min")
 */
export function formatRelativeTime(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins === 0) return 'now';

    if (diffMs > 0) {
        // Future
        if (diffMins < 60) return `in ${diffMins} min`;
        if (diffHours < 24) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else {
        // Past
        const absMins = Math.abs(diffMins);
        const absHours = Math.abs(diffHours);
        const absDays = Math.abs(diffDays);

        if (absMins < 60) return `${absMins} min ago`;
        if (absHours < 24) return `${absHours} hour${absHours > 1 ? 's' : ''} ago`;
        return `${absDays} day${absDays > 1 ? 's' : ''} ago`;
    }
}

/**
 * Calculate rejection expiry (1 hour from creation)
 */
export function calculateRejectionExpiry(createdAt: Date | string): Date {
    const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
    return new Date(created.getTime() + 60 * 60 * 1000); // 1 hour
}

/**
 * Check if rejection has expired
 */
export function isRejectionExpired(rejectionExpires: string | Date | null): boolean {
    if (!rejectionExpires) return false;
    const expires = rejectionExpires instanceof Date ? rejectionExpires : new Date(rejectionExpires);
    return Date.now() > expires.getTime();
}

/**
 * Generate a random ID (client-side, for optimistic updates)
 */
export function generateId(): string {
    return crypto.randomUUID();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce function for typing indicators, etc.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Get role display color class
 */
export function getRoleColorClass(role: string): string {
    switch (role) {
        case 'office':
        case 'factory_office':
        case 'store_office':
            return 'username--office';
        case 'factory':
            return 'username--factory';
        case 'driver_crown':
        case 'driver_electric':
            return 'username--driver';
        default:
            return '';
    }
}
