const mongoose = require("mongoose");

async function updateMohitParent() {
  try {
    await mongoose.connect(
      "mongodb+srv://omrie:Nay%23N2.u%40NGw3_y@cluster0.x28tqcf.mongodb.net/IMS?retryWrites=true&w=majority"
    );
    console.log("Connected to DB");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    const hiteshId = new mongoose.Types.ObjectId("6974c8d43296a83ac89af2b0");
    const mohitId = new mongoose.Types.ObjectId("69d68c0d25300876a84084f8");

    const result = await usersCollection.updateOne(
      { _id: mohitId },
      { $set: { parentId: hiteshId } }
    );

    console.log("Update result:", result.modifiedCount === 1 ? "SUCCESS" : "NO CHANGE");

    // Verify
    const mohit = await usersCollection.findOne({ _id: mohitId });
    console.log("Mohit parentId now:", mohit.parentId?.toString());

    await mongoose.connection.close();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

updateMohitParent();
