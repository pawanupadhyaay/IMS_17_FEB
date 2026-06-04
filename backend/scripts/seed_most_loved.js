const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');

// Use current working directory logic
dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedMostLoved() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is missing');
    
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const seedData = [
      {
        name: 'Tissot',
        videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771778338/TISSOT_Sport_Campaign_1080P_vq21jb.mp4',
        startingPrice: 17000,
        isMostLoved: true,
        isPublished: true,
        displayOrder: 1,
        slug: 'tissot',
        category: 'luxury'
      },
      {
        name: 'Movado',
        videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771779042/Christian_McCaffrey_unveils_the_Museum_Imperiale_a_piece_shaped_by_heritage_and_powered_by_quie_hykmmf.mp4',
        startingPrice: 44625,
        isMostLoved: true,
        isPublished: true,
        displayOrder: 2,
        slug: 'movado',
        category: 'luxury'
      },
      {
        name: 'Rado',
        videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771779389/RADO_Brand_Ambassador_Katrina_Kaif_sharing_her_Wishes_for_India_s_Most_Celebrated_Moments_1080P_xzfbon.mp4',
        startingPrice: 75800,
        isMostLoved: true,
        isPublished: true,
        displayOrder: 3,
        slug: 'rado',
        category: 'luxury'
      },
      {
        name: 'Citizen',
        videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771779691/CITIZEN_Watch_Making_Philosophy_BETTER_STARTS_NOW_1080P_avymuo.mp4',
        startingPrice: 12500,
        isMostLoved: true,
        isPublished: true,
        displayOrder: 4,
        slug: 'citizen',
        category: 'fashion'
      }
    ];

    for (const data of seedData) {
      const result = await Brand.findOneAndUpdate(
        { name: data.name },
        { $set: data },
        { upsert: true, new: true }
      );
      console.log(`Updated/Created: ${result.name} (MostLoved: ${result.isMostLoved})`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding brands:', err);
    process.exit(1);
  }
}

seedMostLoved();
