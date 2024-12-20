import mongoose from 'mongoose';

module.exports = async (): Promise<void> => {
  const instance = (global as any).__MONGOINSTANCE;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (instance) {
    await instance.stop();
  }
};
