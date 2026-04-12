import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
const client = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
const email = 'invitefix_' + Date.now() + '@example.com';
const password = 'TempPass123!';
const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { tam_ad: 'Test User' } });
if (inviteError) { console.error('INVITE_FAIL', inviteError.message); process.exit(1); }
const { error: updateError } = await admin.auth.admin.updateUserById(invited.user.id, { password, email_confirm: true });
if (updateError) { console.error('UPDATE_FAIL', updateError.message); process.exit(2); }
const { error: signInError } = await client.auth.signInWithPassword({ email, password });
if (signInError) { console.error('LOGIN_FAIL', signInError.message); process.exit(3); }
await admin.auth.admin.deleteUser(invited.user.id, true);
console.log('EXISTING_USER_PASSWORD_SYNC_OK');
