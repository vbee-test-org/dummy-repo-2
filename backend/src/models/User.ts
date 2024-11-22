import mongoose, { InferSchemaType, model, Schema } from "mongoose";

const userSchema = new Schema({
  github_id: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  display_name: {
    type: String,
  },
  access_token: {
    type: String,
    required: true,
  },
  refresh_token: {
    type: String,
  },
  is_authenticated: {
    type: Boolean,
    default: false,
    required: true,
  },
  last_login: {
    type: Date,
    default: Date.now(),
  },
});

export type User = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Schema.Types.ObjectId;
};

export const UserModel = model<User>("User", userSchema);
