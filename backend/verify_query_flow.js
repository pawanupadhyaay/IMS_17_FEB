const mongoose = require('mongoose');
const dotenv = require('dotenv');
const StoreQuery = require('./models/StoreQuery');

dotenv.config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create a test inquiry
        const testInquiry = await StoreQuery.create({
            firstName: 'Production',
            lastName: 'Verification',
            email: 'verify@samaywatch.com',
            mobile: '1234567890',
            message: 'This is a final production verification test.',
            status: 'new'
        });
        console.log('Test inquiry created with ID:', testInquiry._id);

        // 2. Fetch it back
        const fetched = await StoreQuery.findById(testInquiry._id);
        if (fetched && fetched.firstName === 'Production') {
            console.log('Verification Successful: Inquiry found in database.');
        } else {
            console.error('Verification Failed: Inquiry not found or data mismatch.');
        }

        // 3. Cleanup (Optional: uncomment if you want to delete the test data)
        // await StoreQuery.findByIdAndDelete(testInquiry._id);
        // console.log('Cleanup: Test inquiry deleted.');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (err) {
        console.error('Verification Error:', err);
        process.exit(1);
    }
};

verify();
