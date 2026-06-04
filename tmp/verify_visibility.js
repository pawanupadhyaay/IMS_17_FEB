const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { Product } = require('../backend/models/Product');
const { Brand } = require('../backend/models/Brand');
const { getStrictStorefrontFilter } = require('../backend/utils/storeEligibility');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const filter = getStrictStorefrontFilter();
        console.log('Filter:', JSON.stringify(filter, null, 2));

        // 1. Check active brands
        const activeBrandNames = await Product.distinct('brand', filter);
        console.log('\n--- Active Brands from Products ---');
        console.log('Count:', activeBrandNames.length);
        console.log('Brands:', activeBrandNames.sort());

        // 2. Check for Bering/Logues specifically
        const bering = await Product.countDocuments({ ...filter, brand: /bering/i });
        const logues = await Product.countDocuments({ ...filter, brand: /logues/i });
        const obaku = await Product.countDocuments({ ...filter, brand: /obaku/i });
        const versus = await Product.countDocuments({ ...filter, brand: /versus/i });

        console.log('\n--- Specific Brand Audit (Should be 0) ---');
        console.log('Bering:', bering);
        console.log('Logues:', logues);
        console.log('Obaku:', obaku);
        console.log('Versus:', versus);

        // 3. Check for Boss/DW (Should be > 0 if they have stock)
        const boss = await Product.countDocuments({ ...filter, brand: /boss/i });
        const dw = await Product.countDocuments({ ...filter, brand: /dw|daniel wellington/i });
        const longines = await Product.countDocuments({ ...filter, brand: /longines/i });

        console.log('\n--- Specific Brand Audit (Should be > 0) ---');
        console.log('Boss:', boss);
        console.log('DW:', dw);
        console.log('Longines:', longines);

        // 4. Simulate getAllBrands logic
        const brandsFromDB = await Brand.find({
            name: { $in: activeBrandNames.map(n => new RegExp('^' + n.trim() + '$', 'i')) }
        }).select('name').lean();
        
        console.log('\n--- Brand Metadata Audit ---');
        console.log('Active brands with metadata docs:', brandsFromDB.length);
        const metadataNames = brandsFromDB.map(b => b.name.toLowerCase());
        const missingMetadata = activeBrandNames.filter(n => !metadataNames.includes(n.toLowerCase()));
        console.log('Active brands MISSING metadata docs (will use fallback):', missingMetadata);

        await mongoose.disconnect();
        console.log('\n✅ Verification complete');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verify();
