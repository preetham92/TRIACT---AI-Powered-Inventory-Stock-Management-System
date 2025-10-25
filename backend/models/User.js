import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Define user schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // ✅ important so password isn't exposed by default
    },
    role: {
      type: String,
      enum: ["owner", "employee"],
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    salary: {
      amount: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ["paid", "pending"],
        default: "pending",
      },
      nextPaymentDate: { type: Date },
    },
  },
  { timestamps: true }
);

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("passwordHash")) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
  next();
});

// ✅ Compare entered password with the hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

// ✅ Safely return public profile data
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash; // Never send hash back
  return obj;
};

// ✅ Export model
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
