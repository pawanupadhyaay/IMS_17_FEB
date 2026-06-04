const mongoose = require('mongoose');
const { Brand } = require('./backend/models/Brand');
require('dotenv').config({path: './backend/.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Brand.updateOne({ name: /rado/i }, { $set: { startingPrice: 87700 } });
  await Brand.updateOne({ name: /tissot/i }, { $set: { startingPrice: 22500 } });
  console.log('Prices updated successfully');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
