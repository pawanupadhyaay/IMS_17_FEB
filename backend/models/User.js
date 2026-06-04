const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, "Please provide a mobile number"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "user", "Owner", "owner", "Staff", "staff"],
      default: "admin",
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    hasSeoAccess: {
      type: Boolean,
      default: false,
    },
    allowedBrands: {
      type: [String],
      default: [],
    },
    canEditProducts: {
      type: Boolean,
      default: true,
    },
    canViewStats: {
      type: Boolean,
      default: true,
    },
    canEditBasicInfo: {
      type: Boolean,
      default: true,
    },
    canEditSeo: {
      type: Boolean,
      default: true,
    },
    canAccessFilters: {
      type: Boolean,
      default: true,
    },
    addresses: [
      {
        fullName: { type: String, required: true, trim: true },
        addressLine1: { type: String, required: true, trim: true },
        addressLine2: { type: String, default: "", trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        isDefault: { type: Boolean, default: false }
      }
    ]
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const User = mongoose.model("User", userSchema);

module.exports = User;

