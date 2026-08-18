import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const client = new Client({
        connectionString: connectionString
    });
    await client.connect();

    try {
        console.log("Fetching view definitions...");
        const res = await client.query(`
            SELECT schemaname, viewname, definition 
            FROM pg_views 
            WHERE viewname IN ('public_urunler_katalog');
        `);

        if (res.rows.length > 0) {
            console.log("Found views:", res.rows.map(r => r.viewname));
            
            for (const row of res.rows) {
                console.log('\nDefinition for ' + row.viewname + ':');
                console.log(row.definition);
            }
        } else {
            console.log("View public_urunler_katalog not found. Is it named something else?");
            const res2 = await client.query(`
                SELECT schemaname, viewname, definition 
                FROM pg_views 
                WHERE viewname LIKE '%urunler%';
            `);
            console.log("Other views found:", res2.rows.map(r => r.viewname));
            for (const row of res2.rows) {
                console.log('\nDefinition for ' + row.viewname + ':');
                console.log(row.definition);
            }
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}
main();
