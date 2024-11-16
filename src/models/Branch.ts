import mongoose, { InferSchemaType, model, Schema } from "mongoose";

const branchSchema = new Schema({
  repo_id: {
    type: String,
    ref: "Repository",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

export type Branch = InferSchemaType<typeof branchSchema> & {
  _id: mongoose.Schema.Types.ObjectId;
};

export const BranchModel = model<Branch>("Branch", branchSchema);
