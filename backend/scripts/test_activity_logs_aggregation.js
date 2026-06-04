const mongoose = require("mongoose");
const ActivityLog = require("../models/ActivityLog");
require("../models/Product");

const testAggregation = async () => {
  try {
    const liveUri = "mongodb+srv://atraskiWeb:AtraskiWeb%402025@cluster0.rwy3f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(liveUri);
    console.log("Connected successfully!");

    const pageNum = 1;
    const limitNum = 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Optimized pipeline with $sort placed immediately after $match
    const pipeline = [
      { $match: {} },
      // Sort placed early to leverage the { createdAt: -1 } index
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          actionType: 1,
          entityType: 1,
          brand: 1,
          sku: 1,
          productId: 1,
          adminId: 1,
          adminName: 1,
          adminEmail: 1,
          createdAt: 1,
          changes: 1,
          metadata: 1,
          thumbnail: {
            $let: {
              vars: {
                images: { $ifNull: ['$product.images', []] },
              },
              in: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: [{ $type: '$$images' }, 'array'] },
                      { $gt: [{ $size: '$$images' }, 0] },
                    ],
                  },
                  then: { $arrayElemAt: ['$$images', 0] },
                  else: null,
                },
              },
            },
          },
        },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNum },
          ],
          total: [
            { $count: 'count' },
          ],
        },
      },
    ];

    console.log("Executing optimized aggregation pipeline with allowDiskUse(true)...");
    const result = await ActivityLog.aggregate(pipeline).allowDiskUse(true);
    
    const logs = result[0]?.data || [];
    const total = result[0]?.total[0]?.count || 0;
    
    console.log(`\n🎉 Optimized aggregation succeeded!`);
    console.log(`Total matched count: ${total}`);
    console.log(`Logs returned (page 1): ${logs.length}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error during aggregation test:", error);
    process.exit(1);
  }
};

testAggregation();
