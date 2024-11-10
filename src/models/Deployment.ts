import { Schema } from "mongoose";

const DeploymentSchema = new Schema({
  branch: String,
  name: String,
  status: String,
  conclusion: String,
  started_at: Date,
  finished_at: Date,
});
