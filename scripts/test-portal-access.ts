import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function runTest() {
    console.log('--- STARTING PORTAL ACCESS TEST ---');

    // 1. Create a dummy Firma for the test
    const dummyFirmaEmail = `test_firma_${Date.now()}@example.com`;
    const { data: firma, error: firmaError } = await supabaseAdmin
        .from('firmalar')
        .insert({
            unvan: 'Test Portal Firması A.Ş.',
            email: dummyFirmaEmail,
            status: 'ADAY',
            kategori: 'Cafe',
        })
        .select('id')
        .single();

    if (firmaError || !firma) {
        console.error('Failed to create dummy firma:', firmaError);
        return;
    }
    const firmaId = firma.id;
    console.log(`✅ Created dummy firma (ID: ${firmaId})`);

    // 2. Call the API endpoint logic directly or via fetch if server is running
    // Since we are not guaranteed to have the API running and accessible to admin easily from script,
    // We will simulate what the API does logically, but using a fetch to local server is better to test the exact API.
    // Let's assume dev server is running on http://localhost:3000
    
    console.log('Testing the /api/admin/create-personel-user endpoint logic...');

    // Instead of HTTP (needs cookie auth), let's call the functions directly using Service Role
    // Because auth is difficult to simulate as an admin cookie from script.
    
    // We'll execute the EXACT same DB calls the API does to verify it works without throwing RLS errors.
    const userEmail = `portal_user_${Date.now()}@example.com`;
    const userPassword = `TestPass123!`;

    console.log(`Creating user with email: ${userEmail}`);
    const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: userPassword,
        email_confirm: true,
    });

    if (createErr || !createdUser.user) {
        console.error('Failed to create user:', createErr);
        return;
    }
    console.log(`✅ Created user (ID: ${createdUser.user.id})`);

    const { error: profileErr } = await supabaseAdmin.from('profiller').upsert({
        id: createdUser.user.id,
        rol: 'Müşteri',
        tam_ad: 'Test Yetkili',
        firma_id: firmaId,
    });

    if (profileErr) {
        console.error('Failed to create profile:', profileErr);
        return;
    }
    console.log('✅ Upserted profile');

    const { error: updateFirmaErr } = await supabaseAdmin.from('firmalar')
        .update({ status: 'MÜŞTERİ' })
        .eq('id', firmaId);

    if (updateFirmaErr) {
        console.error('Failed to update firma status:', updateFirmaErr);
        return;
    }
    console.log('✅ Updated firma status to MÜŞTERİ');

    // 3. Now try to login as the created user (The Customer)
    console.log('--- TESTING CUSTOMER LOGIN ---');
    const supabaseCustomer = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false },
    });

    const { data: signInData, error: signInErr } = await supabaseCustomer.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
    });

    if (signInErr || !signInData.user) {
        console.error('Failed to login as customer:', signInErr);
        return;
    }
    console.log('✅ Successfully logged in as customer!');

    // 4. Test RLS on products / pricing view (What customer sees)
    console.log('--- TESTING PRICING / CATALOG RLS ---');
    
    const { data: products, error: prodErr } = await supabaseCustomer
        .from('urunler')
        .select('*')
        .limit(5);

    if (prodErr) {
        console.error('Customer failed to read products:', prodErr);
    } else {
        console.log(`✅ Customer can read products. Found ${products.length} products.`);
    }

    // Attempt to access admin data to ensure RLS blocks it
    const { error: adminDataErr } = await supabaseCustomer
        .from('etkinlikler') // Customer should not generally read arbitrary CRM events
        .select('*')
        .limit(1);

    if (adminDataErr) {
         console.log('✅ RLS correctly blocked access to admin CRM data. Error:', adminDataErr.message);
    } else {
         console.warn('⚠️ WARNING: Customer was able to read CRM events! RLS might be misconfigured.');
    }

    // CLEANUP
    console.log('--- CLEANUP ---');
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    await supabaseAdmin.from('firmalar').delete().eq('id', firmaId);
    console.log('✅ Cleanup finished.');
    console.log('--- TEST COMPLETE ---');
}

runTest().catch(console.error);
