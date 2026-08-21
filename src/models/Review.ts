import mongoose, {
  Schema,
  Document,
  Types,
} from 'mongoose'

export interface IReview extends Document {
  artisan: Types.ObjectId
  client: Types.ObjectId

  rating: number
  comment: string
  service: string
}

const ReviewSchema = new Schema<IReview>(
  {
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'ArtisanProfile',
      required: true,
      index: true,
    },

    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
    },

    service: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IReview>(
  'Review',
  ReviewSchema
)