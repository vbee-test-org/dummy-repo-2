import { InferSchemaType, model, Schema } from "mongoose";

const repositorySchema = new Schema(
  {
    _id: {
      type: String,
      unique: true,
    },
    full_name: {
      type: String,
      required: true,
    },
    default_branch: String,
    visibility: {
      type: String,
      enum: ["public", "private", "internal"],
      default: "public",
    },
  },
  { timestamps: true },
);

type Repository = InferSchemaType<typeof repositorySchema>;

export default model<Repository>("Repository", repositorySchema);
