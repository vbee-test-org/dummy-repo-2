import { InferSchemaType, model, Schema } from "mongoose";

const repositorySchema = new Schema({
  _id: {
    type: Number,
    unique: true,
  },
  full_name: {
    type: String,
    required: true,
  },
  private: {
    type: Boolean,
  },
});

type Repository = InferSchemaType<typeof repositorySchema>;

export default model<Repository>("Repository", repositorySchema);
