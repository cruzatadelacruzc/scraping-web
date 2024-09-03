import { connect } from 'mongoose';

/**
 * Create connection with MongoDB database.
 *
 * @param uri - The URI of the MongoDB database.
 */
async function dbConnect(): Promise<void> {
  const DB_URI = <string>process.env.DB_URI;
  try {
    await connect(DB_URI);
    console.log('Conexión a la base de datos establecida.');
  } catch (error) {
    console.error('🔥 ', error);
    throw error;
  }
}

export default dbConnect;
