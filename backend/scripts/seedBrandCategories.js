/**
 * Populate the Brand collection from distinct brand names in Products.
 * Then assign category = "luxury" or "fashion" for each.
 *
 * Run manually:  node scripts/seedBrandCategories.js
 *
 * SAFE: Only creates/updates Brand documents. No Product data is modified.
 */
const mongoose = require('mongoose')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { Brand } = require('../models/Brand')
const { Product } = require('../models/Product')

const LUXURY_SLUGS = [
  'rado',
  'tissot',
  'longines',
  'seiko',
  'citizen',
  'movado',
  'victorinox',
  'balmain',
  'swarovski',
]

function slugify(name) {
  if (!name || typeof name !== 'string') return ''
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function run() {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected!\n')

    // 1. Get all distinct brand names from Product collection
    const brandNames = await Product.distinct('brand', { brand: { $ne: '' } })
    console.log(`📋 Found ${brandNames.length} distinct brands in Products:\n   ${brandNames.join(', ')}\n`)

    // 2. Upsert each into Brand collection
    let created = 0
    let updated = 0
    for (const name of brandNames) {
      if (!name || !name.trim()) continue
      const slug = slugify(name)
      if (!slug) continue
      const category = LUXURY_SLUGS.includes(slug) ? 'luxury' : 'fashion'

      const existing = await Brand.findOne({ slug })
      if (existing) {
        // Only update category if it changed
        if (existing.category !== category) {
          existing.category = category
          await existing.save()
          updated++
        }
      } else {
        await Brand.create({
          name,
          slug,
          category,
          isPublished: true,
          displayOrder: 0,
        })
        created++
      }
    }

    console.log(`✅ Created ${created} new Brand documents`)
    console.log(`✅ Updated ${updated} existing Brand documents\n`)

    // 3. Summary
    const all = await Brand.find({ isPublished: true })
      .select('name slug category')
      .sort({ category: 1, name: 1 })
      .lean()

    console.log('📋 Final Brand Categories:')
    all.forEach((b) =>
      console.log(`   ${b.category.padEnd(8)} │ ${b.name} → /collections/${b.slug}`)
    )

    await mongoose.connection.close()
    console.log('\n✅ Done!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    await mongoose.connection.close()
    process.exit(1)
  }
}

run()
