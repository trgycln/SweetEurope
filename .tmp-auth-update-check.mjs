import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
const client = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
const email = 'pwupdate' + Date.now() + '@gmail.com';
const firstPassword = 'TempPass123!';
const secondPassword = 'TempPass456!';
const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: firstPassword, email_confirm: true });
if (createError) { console.error('CREATE_FAIL', createError.message); process.exit(1); }
const { error: updateError } = await admin.auth.admin.updateUserById(created.user.id, { password: secondPassword, email_confirm: true });
if (updateError) { console.error('UPDATE_FAIL', updateError.message); process.exit(2); }
const { error: signInError } = await client.auth.signInWithPassword({ email, password: secondPassword });
if (signInError) { console.error('LOGIN_FAIL', signInError.message); process.exit(3); }
await admin.auth.admin.deleteUser(created.user.id, true);
console.log('PASSWORD_UPDATE_LOGIN_OK');
