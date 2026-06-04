const mongoose = require("mongoose");

const checkOmrieDb = async () => {
  try {
    const omrieUri = "mongodb+srv://omrie:Nay%23N2.u%40NGw3_y@cluster0.x28tqcf.mongodb.net/IMS?retryWrites=true&w=majority";
    await mongoose.connect(omrieUri);
    const db = mongoose.connection.client.db("IMS");
    
    console.log("Checking IMS database collections in OMRIE cluster...");
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments({});
      console.log(`- ${col.name}: ${count} documents`);
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error during OMRIE database check:", error);
    process.exit(1);
  }
};

checkOmrieDb();
