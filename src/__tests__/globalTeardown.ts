import mongoose from 'mongoose';

module.exports = async () => {
  const instance = (global as any).__MONGOINSTANCE;
  await mongoose.disconnect();
  await instance.stop();
};
