const mongoose = require("mongoose");

const storeQuerySchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Inquiry message is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["new", "read", "responded", "archived"],
      default: "new",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster searching in dashboard
storeQuerySchema.index({ createdAt: -1 });
storeQuerySchema.index({ status: 1 });

const StoreQuery = mongoose.model("StoreQuery", storeQuerySchema);

module.exports = StoreQuery;
