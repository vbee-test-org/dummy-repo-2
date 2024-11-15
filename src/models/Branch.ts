import { InferSchemaType, model, Schema } from "mongoose";

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

type Branch = InferSchemaType<typeof branchSchema>;

export default model<Branch>("Branch", branchSchema);
