import { InferSchemaType, model, Schema } from "mongoose";

const deploymentSchema = new Schema({
  branch: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  status: {
    type: String,
  },
  conclusion: {
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

type Deployment = InferSchemaType<typeof deploymentSchema>;

export default model<Deployment>("Deployment", deploymentSchema);
