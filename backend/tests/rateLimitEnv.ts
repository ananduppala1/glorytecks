/**
 * Tight rate-limit thresholds for the route tests.
 *
 * Must be its OWN module, imported before anything else. Import declarations
 * are hoisted above ordinary statements, so assigning these at the top of the
 * test file would run after `config/env` had already read process.env and
 * frozen the defaults — see the same warning in setup.ts.
 *
 * That every one of these has an effect is itself the assertion that the
 * policy is environment-configurable rather than compiled into route code.
 */
process.env.RATE_LIMIT_FAIL_MODE = 'local';
process.env.TRUST_PROXY_HOPS = '1';
process.env.AUTH_RATE_LIMIT_MAX = '3';
process.env.AUTH_ACCOUNT_RATE_LIMIT_MAX = '2';
process.env.AUTH_TOTAL_RATE_LIMIT_MAX = '8';
process.env.REFRESH_RATE_LIMIT_MAX = '3';
process.env.PASSWORD_RATE_LIMIT_MAX = '2';
process.env.PUBLIC_WRITE_RATE_LIMIT_MAX = '2';
process.env.PUBLIC_READ_RATE_LIMIT_MAX = '10';
process.env.PUBLIC_SEARCH_RATE_LIMIT_MAX = '2';
process.env.ADMIN_WRITE_RATE_LIMIT_MAX = '3';
process.env.EXPENSIVE_RATE_LIMIT_MAX = '2';
process.env.AUTH_BACKOFF_AFTER = '2';
process.env.AUTH_BACKOFF_BASE_MS = '10';
process.env.AUTH_BACKOFF_MAX_MS = '30';
