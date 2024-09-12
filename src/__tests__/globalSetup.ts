import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

module.exports = async () => {
  // it's needed in global space, because we don't want to create a new instance every test-suite
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();
  (global as any).__MONGOINSTANCE = instance;
  process.env.DB_URI = uri.slice(0, uri.lastIndexOf('/'));

  // The following is to make sure the database is clean before a test suite starts
  const connection = await mongoose.connect(`${process.env.DB_URI}/jest`);
  if (connection?.connection?.db) {
    await connection.connection.db.dropDatabase();
  }
  await mongoose.disconnect();
};
