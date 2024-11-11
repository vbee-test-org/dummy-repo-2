import { InferSchemaType, model, Schema } from "mongoose";

const repositorySchema = new Schema({});

type Repository = InferSchemaType<typeof repositorySchema>;

export default model<Repository>("Repository", repositorySchema);
