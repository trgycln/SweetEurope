import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const specsPath = path.resolve('extracted_specs.json')
  if (!fs.existsSync(specsPath)) {
    console.error('extracted_specs.json not found.')
    return
  }

  const specs = JSON.parse(fs.readFileSync(specsPath, 'utf8'))
  console.log(`Loaded ${specs.length} product specs.`)

  // Fetch all active products
  const { data: urunler, error } = await supabase
    .from('urunler')
    .select('id, ad, teknik_ozellikler')
    .eq('aktif', true)

  if (error) {
    console.error('Error fetching products:', error)
    return
  }

  console.log(`Found ${urunler.length} active products in DB.`)

  let updatedCount = 0

  for (const spec of specs) {
    if (!spec.orjinal_ad) continue

    // The document name might be slightly different from DB name. 
    // E.g. "CARAMEL SYRUP - PREMIUM" vs "Caramel Syrup Premium"
    let cleanSpecName = spec.orjinal_ad
    if (cleanSpecName.includes('Packaging Amount')) {
        cleanSpecName = cleanSpecName.split('Packaging Amount')[0]
    }
    if (cleanSpecName.includes('Packing type')) {
        cleanSpecName = cleanSpecName.split('Packing type')[0]
    }
    if (cleanSpecName.includes('|')) {
        cleanSpecName = cleanSpecName.split('|')[0]
    }
    
    cleanSpecName = cleanSpecName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
    
    // Very short names might match too broadly, skip if < 3 chars
    if (cleanSpecName.length < 3) continue;
    
    // We should search if any product name (ad) matches or if the spec name is contained in the DB product name
    const matchedProduct = urunler.find(u => {
      let dbName = ''
      if (typeof u.ad === 'string') {
        dbName = u.ad
      } else if (u.ad && typeof u.ad === 'object') {
        dbName = u.ad.tr || u.ad.en || u.ad.de || ''
      }
      dbName = dbName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
      
      // Some DB products might be "fo caramel syrup premium 70cl", cleanSpecName might be "caramel syrup premium"
      return dbName.includes(cleanSpecName) || cleanSpecName.includes(dbName)
    })

    if (matchedProduct) {
      console.log(`Matching: ${spec.orjinal_ad} -> ${matchedProduct.ad}`)

      // Merge existing teknik_ozellikler with the usage description
      let currentTeknik = matchedProduct.teknik_ozellikler || {}
      if (typeof currentTeknik !== 'object') currentTeknik = {}
      if (spec.aciklama && spec.aciklama.en) {
         currentTeknik.usage_instructions = spec.aciklama
      }

      const updateData = {
        inhaltsstoffe: spec.inhaltsstoffe,
        allergene: spec.allergene,
        naehrwerte: spec.naehrwerte,
        lagertemperatur_min_celsius: spec.lagertemperatur_min_celsius,
        lagertemperatur_max_celsius: spec.lagertemperatur_max_celsius,
        haltbarkeit_monate: spec.haltbarkeit_monate,
        teknik_ozellikler: currentTeknik
      }

      // Remove undefined/null if any, though Supabase is usually fine with it
      const { error: updateError } = await supabase
        .from('urunler')
        .update(updateData)
        .eq('id', matchedProduct.id)

      if (updateError) {
        console.error(`Error updating ${matchedProduct.ad}:`, updateError)
      } else {
        updatedCount++
      }
    } else {
      console.warn(`No match found in DB for spec: ${spec.orjinal_ad}`)
    }
  }

  console.log(`Finished updating ${updatedCount} products.`)
}

main().catch(console.error)
