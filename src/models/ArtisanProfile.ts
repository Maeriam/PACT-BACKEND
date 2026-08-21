import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IArtisanProfile extends Document {
  user: Types.ObjectId
  services: string[]
  experience: string
  education: string
  trainingDetails: string
  bio: string
  startingPrice: number
  nin: string
  verificationStatus: 'unverified' | 'pending' | 'verified'
  rating: number
  reviewCount: number
  completedJobs: number
}

const ArtisanProfileSchema = new Schema<IArtisanProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    services: {
      type: [String],
      default: [],
    },

    experience: {
      type: String,
      default: '',
    },

    education: {
      type: String,
      default: '',
    },

    trainingDetails: {
      type: String,
      default: '',
    },

    bio: {
      type: String,
      default: '',
    },

    startingPrice: {
      type: Number,
      default: 0,
    },

    nin: {
      type: String,
      select: false,
    },

    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified','failed'],
      default: 'unverified',
    },

    rating: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    completedJobs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IArtisanProfile>(
  'ArtisanProfile',
  ArtisanProfileSchema
)