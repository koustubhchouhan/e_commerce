// Lightweight, synchronous check for whether browser-side Google OAuth is
// configured.
//
// This lives apart from googleAuth.js on purpose: the Supabase client it would
// otherwise pull in is large, and the login/signup screens only need to know
// whether to show the Google button. The heavy module is imported on demand
// when the button is actually clicked, keeping it out of the first-load bundle.
const URL = import.meta.env?.VITE_SUPABASE_URL;
const ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isGoogleOAuthConfigured = Boolean(URL && ANON);
