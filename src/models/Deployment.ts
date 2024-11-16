import mongoose, { InferSchemaType, model, Schema } from "mongoose";

const deploymentSchema = new Schema({
  _id: {
    type: Number,
    required: true,
  },
  commit_id: {
    type: String,
    ref: "Commit",
    required: true,
  },
  branch_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  service_name: {
    type: String,
  },
  status: {
    type: String,
  },
  started_at: {
    type: Date,
    required: true,
  },
  finished_at: {
    type: Date,
  },
  duration: {
    type: Number,
    default: function (this: { started_at: Date; finished_at?: Date }) {
      if (!this.finished_at) {
        return null;
      }
      return (this.finished_at.getTime() - this.started_at.getTime()) / 1000;
    },
  },
});

export type Deployment = InferSchemaType<typeof deploymentSchema>;

export const DeploymentModel = model<Deployment>(
  "Deployment",
  deploymentSchema,
);
