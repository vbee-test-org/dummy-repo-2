import { InferSchemaType, model, Schema } from "mongoose";

const branchSchema = new Schema({
  _id: {
    type: String,
    unique: true,
  },
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

type Branch = InferSchemaType<typeof branchSchema>;

export default model<Branch>("Branch", branchSchema);
