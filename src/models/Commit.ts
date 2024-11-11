import { InferSchemaType, model, Schema } from "mongoose";

const commitSchema = new Schema({});

type Commit = InferSchemaType<typeof commitSchema>;

export default model<Commit>("Commit", commitSchema);
