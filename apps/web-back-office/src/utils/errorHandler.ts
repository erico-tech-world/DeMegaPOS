/**
 * Global User-Friendly Error Abstraction Utility
 * 
 * Intercepts low-level database runtime errors (Prisma codes, foreign key violations, 
 * unique constraint collisions) and network/validation exceptions, transforming them into
 * clean, actionable, human-readable UI copy for modal alerts and toasts.
 */

export function formatErrorMessage(error: any, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
    if (!error) return fallbackMessage;

    // 1. Direct string error
    if (typeof error === 'string') {
        return sanitizeMessage(error, fallbackMessage);
    }

    // 2. Extract nested message from Axios or Fastify response
    let rawMsg: any = error?.response?.data?.message || 
                     error?.response?.data?.error || 
                     error?.response?.data?.details ||
                     error?.message;

    // 3. Fastify / Zod validation error array
    if (Array.isArray(rawMsg)) {
        const issues = rawMsg.map((m: any) => typeof m === 'string' ? m : m?.message).filter(Boolean);
        if (issues.length > 0) {
            return `Please check your inputs: ${issues.join(', ')}`;
        }
        return 'Unable to save. Please complete all required fields with valid values.';
    }

    // 4. Object error message
    if (typeof rawMsg === 'object' && rawMsg !== null) {
        if (rawMsg.message) {
            rawMsg = rawMsg.message;
        } else {
            rawMsg = JSON.stringify(rawMsg);
        }
    }

    const msgStr = String(rawMsg || '').trim();
    const target = String(error?.response?.data?.target || error?.response?.data?.field || '').toLowerCase();

    return sanitizeMessage(msgStr, fallbackMessage, target);
}

function sanitizeMessage(msg: string, fallback: string, targetHint = ''): string {
    const lower = msg.toLowerCase();
    const combined = `${lower} ${targetHint}`.toLowerCase();

    // ─── Unique Constraint Violations (Prisma P2002) ──────────────────────────
    if (combined.includes('p2002') || combined.includes('unique constraint') || combined.includes('already exists')) {
        if (combined.includes('sku')) {
            return 'A product with this SKU already exists. Please verify the SKU ID.';
        }
        if (combined.includes('barcode')) {
            return 'A product with this barcode already exists. Please check the barcode.';
        }
        if (combined.includes('email')) {
            return 'A record with this email address already exists. Please use a different email.';
        }
        if (combined.includes('phone')) {
            return 'A record with this phone number already exists. Please verify the phone number.';
        }
        if (combined.includes('name') && combined.includes('category')) {
            return 'A category with this name already exists.';
        }
        if (combined.includes('staffcode') || combined.includes('staff_code')) {
            return 'A staff member with this staff code already exists.';
        }
        return 'A record with this identifier already exists. Please verify your entries.';
    }

    // ─── Foreign Key Constraint Violations (Prisma P2003) ─────────────────────
    if (combined.includes('p2003') || combined.includes('foreign key') || combined.includes('violates foreign key')) {
        return 'The referenced item, customer, or category could not be found or is currently in use.';
    }

    // ─── Record Not Found (Prisma P2025) ──────────────────────────────────────
    if (combined.includes('p2025') || combined.includes('record to update not found') || combined.includes('record to delete does not exist')) {
        return 'The requested record was not found or has already been removed.';
    }

    // ─── Database Connectivity / Pooler / Initialization Errors (P1000, P1001, P1002, P1008, P1017, 503) ───
    if (
        combined.includes('databaseunavailable') ||
        combined.includes('p1001') ||
        combined.includes('p1002') ||
        combined.includes('p1008') ||
        combined.includes('p1017') ||
        combined.includes('p1000') ||
        combined.includes("can't reach database") ||
        combined.includes('cant reach database') ||
        combined.includes('server has closed the connection') ||
        combined.includes('database service is temporarily unavailable') ||
        combined.includes('prismaclientinitializationerror') ||
        combined.includes('prismaclientrustpanicerror')
    ) {
        return 'Database service is temporarily reconnecting. Please wait a moment and click Refresh.';
    }

    // ─── Checkout & Order Processing Errors ────────────────────────────────────
    if (
        lower.includes('checkout') ||
        lower.includes('order creation') ||
        lower.includes('unable to complete order') ||
        lower.includes('databaseschemamismatch')
    ) {
        return 'Unable to complete order. Please verify item stock and try again.';
    }

    // ─── Raw Prisma Client or SQL Stacks ──────────────────────────────────────
    if (lower.includes('prismaclient') || lower.includes('invocation') || lower.includes('syntax error') || lower.includes('database error')) {
        return 'Unable to complete order. Please verify item stock and try again.';
    }

    // ─── Authentication & Authorization Errors ────────────────────────────────
    if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('jwt') || lower.includes('not authenticated')) {
        return 'Your session has expired or is invalid. Please log in again.';
    }
    if (lower.includes('403') || lower.includes('forbidden') || lower.includes('access restricted') || lower.includes('access revoked')) {
        return 'You do not have permission to perform this action. Contact an administrator.';
    }

    // ─── Network & Connectivity Failures ──────────────────────────────────────
    if (lower.includes('network error') || lower.includes('failed to fetch') || lower.includes('econnrefused') || lower.includes('enotfound')) {
        return 'Unable to reach the server. Please check your internet connection.';
    }
    if (lower.includes('timeout') || lower.includes('econnaborted')) {
        return 'The server took too long to respond. Please try again shortly.';
    }

    // ─── General HTTP 500 Internal Server Errors ──────────────────────────────
    if (lower.includes('500 internal server error') || lower === 'internal server error') {
        return 'The server encountered an error processing your request. Please try again.';
    }

    // ─── Route & 404 Not Found Errors ─────────────────────────────────────────
    if (
        (lower.includes('route ') && lower.includes('not found')) ||
        lower.includes('cannot put') ||
        lower.includes('cannot post') ||
        lower.includes('cannot patch') ||
        lower.includes('cannot get') ||
        lower.includes('status code 404') ||
        lower.includes('not found: route') ||
        lower === 'not found'
    ) {
        if (combined.includes('draft')) {
            return 'Unable to update draft order. Please try again.';
        }
        return fallback || 'The requested service endpoint could not be reached. Please try again.';
    }

    // ─── Empty or Generic Defaults ────────────────────────────────────────────
    if (!msg || msg === '{}' || msg === 'null' || msg === 'undefined') {
        return fallback;
    }

    // Clean up any remaining leading/trailing quotes or brackets
    const cleaned = msg.replace(/^["']|["']$/g, '').trim();
    return cleaned || fallback;
}
