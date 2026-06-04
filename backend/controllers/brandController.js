const { Brand } = require('../models/Brand')
const { Product } = require('../models/Product')
const { getStrictStorefrontFilter } = require('../utils/storeEligibility')

async function getMostLovedBrands(req, res) {
  try {
    // Optimized: Fetch most loved brands directly without expensive Product.distinct scan
    const brands = await Brand.find({ isMostLoved: true })
      .sort({ name: 1 })
      .select('name slug videoUrl thumbnail startingPrice displayOrder category')
      .lean()

    return res.status(200).json({ success: true, data: brands })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch brands' })
  }
}

async function getAllBrands(req, res) {
  try {
    // 1. Source of Truth: Aggregate products to see which categories they belong to
    // We strictly follow the 3 criteria (Title, Image, Stock) via getStrictStorefrontFilter
    const activeBrandsInfo = await Product.aggregate([
      { $match: getStrictStorefrontFilter() },
      { 
        $group: { 
          _id: "$brand", 
          categories: { $push: "$category" } 
        } 
      }
    ]);

    const activeBrandNames = activeBrandsInfo.map(b => b._id).filter(Boolean);

    // 2. Fetch Brand Metadata (Slugs, isMostLoved)
    const brandsFromDB = await Brand.find({
      name: { $in: activeBrandNames.map(n => new RegExp('^' + n.trim() + '$', 'i')) }
    })
    .select('name slug category displayOrder isMostLoved')
    .lean();

    const brandMap = new Map();
    brandsFromDB.forEach(b => {
      brandMap.set(b.name.toLowerCase().trim(), b);
    });

    // 3. Construct final items, syncing with IMS Product Categories
    const finalResult = activeBrandsInfo.map(info => {
      const name = info._id;
      const cleanName = name.trim();
      const lowerName = cleanName.toLowerCase();
      
      // Determine the winner category based on product frequency dynamically
      const counts = {};
      (info.categories || []).forEach(cat => {
        const norm = cat?.toLowerCase().trim() || 'fashion';
        counts[norm] = (counts[norm] || 0) + 1;
      });
      
      // Majority wins. Default to fashion if empty.
      let maxCount = -1;
      let category = 'fashion';
      for (const [cat, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          category = cat;
        }
      }
      
      let meta = brandMap.get(lowerName);

      // Metadata matching fallback
      if (!meta) {
        for (const [key, value] of brandMap.entries()) {
          if (key.startsWith(lowerName) || lowerName.startsWith(key)) {
            meta = value;
            break;
          }
        }
      }
      

      return {
        name: cleanName,
        slug: meta?.slug || cleanName.toLowerCase().replace(/[\s&]+/g, '-').replace(/[^\w-]+/g, ''),
        category: category,
        displayOrder: meta?.displayOrder || 999,
        isMostLoved: meta?.isMostLoved || false
      };
    });

    // Purely Alphabetical Sort
    finalResult.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    return res.status(200).json({ success: true, data: finalResult })
  } catch (err) {
    console.error('[API Error] getAllBrands:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch brands' })
  }
}

module.exports = { getMostLovedBrands, getAllBrands }

