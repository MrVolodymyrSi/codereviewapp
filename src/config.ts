// Used by data files (api.js in challenges) for Edge Function calls
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ?? ''
// Used by the Supabase JS client
export const SUPABASE_PROJECT_URL: string = import.meta.env.VITE_SUPABASE_URL ?? ''
// Used by the Supabase JS client for authentication
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
