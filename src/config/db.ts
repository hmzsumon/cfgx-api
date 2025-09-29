import mongoose from "mongoose";

const getMongoURI = (): string => {
  if (process.env.NODE_ENV === "PRODUCTION") {
    return process.env.DB_URI || "";
  } else {
    return "mongodb://0.0.0.0:27017/capi-local";
  }
};

export const connectDB = async (): Promise<void> => {
  const URI = getMongoURI();
  console.log(`🔗 MongoDB URI: ${URI}`);

  try {
    const conn = await mongoose.connect(URI);
    console.log(`✅ MongoDB connected with server: ${conn.connection.host}`);
  } catch (err: any) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};
