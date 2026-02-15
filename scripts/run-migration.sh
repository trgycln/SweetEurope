#!/bin/bash

# Migration Script: Migrate Old Categories to New System (A, B, C, D)
# This script runs the SQL migration to convert all old categories to the new system

# Prerequisites:
# - Supabase CLI installed: https://supabase.com/docs/guides/cli
# - You must be logged in to Supabase: `supabase login`
# - Database connection credentials configured

echo "🔧 Starting migration: Old Categories → New System (A, B, C, D)"
echo "=================================================="
echo ""

# Option 1: Using Supabase CLI (Recommended)
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found. Running migration..."
    supabase db push --dry-run  # First, test the migration
    echo ""
    echo "Review the dry-run output above. If correct, run:"
    echo "  supabase db push"
else
    echo "❌ Supabase CLI not found. Please install it:"
    echo "   npm install -g @supabase/cli"
    echo ""
    echo "Then run the migration with:"
    echo "   supabase db push"
fi

echo ""
echo "=================================================="
echo "📝 Manual SQL Execution (if needed):"
echo "=================================================="
echo "1. Go to Supabase Dashboard"
echo "2. Open SQL Editor"
echo "3. Copy content from: supabase-migrations/migrate_old_categories_to_new_system.sql"
echo "4. Run the SQL"
echo ""
echo "5. Verify the migration with:"
echo "   SELECT kategori, COUNT(*) as count FROM firmalar GROUP BY kategori;"
echo ""
echo "Done! ✅"
