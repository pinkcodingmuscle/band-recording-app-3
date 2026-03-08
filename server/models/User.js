import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    avatar: { type: String, default: '🎵' },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
