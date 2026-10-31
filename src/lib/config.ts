const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
const requestedDataMode = (import.meta.env.VITE_DATA_MODE as string | undefined)?.trim().toLowerCase();

export const SUPABASE_URL = url ?? '';
export const SUPABASE_KEY = publishableKey || anonKey || '';
export const SUPABASE_ANON_KEY = SUPABASE_KEY;
export const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_KEY);

// The app runs against Supabase whenever credentials are present. Set
// VITE_DATA_MODE=demo to force the browser-only demo driver even when keys are
// configured (useful for offline demos and UI work).
export const DATA_MODE: 'supabase' | 'demo' =
  HAS_SUPABASE_CONFIG && requestedDataMode !== 'demo' ? 'supabase' : 'demo';
export const IS_SUPABASE_MODE = DATA_MODE === 'supabase';
export const DEMO_MODE = !IS_SUPABASE_MODE;

export const APP_NAME = 'SPACEXCHANGE';
export const DEMO_STORAGE_KEY = 'spacexchange.db.v1';
export const DEMO_SESSION_KEY = 'spacexchange.session.v1';
export const DEMO_SEARCH_KEY = 'spacexchange.search.v1';

export const DEMO_ACCOUNTS = [
  {
    role: 'User',
    email: 'user@spacexchange.demo',
    password: 'User@123',
    description: 'Book resources, check eligibility, check in and out.',
  },
  {
    role: 'Resource Owner',
    email: 'owner@spacexchange.demo',
    password: 'Owner@123',
    description: 'List resources, approve requests, manage handovers.',
  },
  {
    role: 'Institution Manager',
    email: 'manager@spacexchange.demo',
    password: 'Manager@123',
    description: 'Review incidents, verify institutions, oversee bookings.',
  },
  {
    role: 'Administrator',
    email: 'admin@spacexchange.demo',
    password: 'Admin@123',
    description: 'Manage roles, listings, eligibility rules and audit history.',
  },
];
