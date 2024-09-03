import mongoose from 'mongoose';

beforeAll(async () => {
    // put your client connection code here, example with mongoose:
    const dbUri = process.env.DB_URI;

    if (!dbUri) {
      throw new Error('DB_URI is not defined');
    }

    await mongoose.connect(dbUri);
});

afterAll(async () => {
    // put your client disconnection code here, example with mongoose:
    await mongoose.disconnect();
});