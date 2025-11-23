import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
    'https://atydffkpyvxcmzxyibhj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MDg0ODUsImV4cCI6MjA0NzA4NDQ4NX0.X7TkJxuRdLLAP3RL8LpNjlKGo-2FgFqCYWX85LtMyHs'
);

async function runMigrations() {
    console.log('🚀 Starting CRM Enhancement Migrations...\n');

    try {
        // Read migration files
        const migration1 = readFileSync(
            join(process.cwd(), 'supabase-migrations', 'enhance_crm_marketing_features.sql'),
            'utf-8'
        );
        
        const migration2 = readFileSync(
            join(process.cwd(), 'supabase-migrations', 'trigger_auto_update_son_etkilesim.sql'),
            'utf-8'
        );

        console.log('📋 Step 1: Adding new columns and updating enums...');
        const { error: error1 } = await supabase.rpc('exec_sql', { sql: migration1 });
        
        if (error1) {
            console.error('❌ Error in migration 1:', error1);
            throw error1;
        }
        console.log('✅ Step 1 completed!\n');

        console.log('📋 Step 2: Creating trigger for auto-update...');
        const { error: error2 } = await supabase.rpc('exec_sql', { sql: migration2 });
        
        if (error2) {
            console.error('❌ Error in migration 2:', error2);
            throw error2;
        }
        console.log('✅ Step 2 completed!\n');

        console.log('🎉 All migrations completed successfully!');
        console.log('\n📝 Summary:');
        console.log('   - Added: oncelik, instagram_url, facebook_url, web_url, google_maps_url, son_etkilesim_tarihi');
        console.log('   - Updated: firma_status enum (Aday, Takipte, Temas Kuruldu, İletişimde, Müşteri, Pasif)');
        console.log('   - Updated: etkinlik_tipi enum (Instagram DM, Instagram Yorum, E-Mail Gönderimi, Yüz Yüze Ziyaret)');
        console.log('   - Created: Auto-update trigger for son_etkilesim_tarihi');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
