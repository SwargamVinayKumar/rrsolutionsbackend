const mongoose = require('mongoose');
const { SUBSCRIPTION_DURATIONS, MEMBERSHIP_TYPES } = require('../config/api');



const SubscriptionSchema = new mongoose.Schema(
  {
    paymentStatus: {
      type: String,
      default: "",
      enum: ["pending","success","failed"]
    },
    orderId: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
      required: true
    },
    membershipType: {
      type: String,
      enum: MEMBERSHIP_TYPES,
      required: true
    },
    duration: {
      type: String,
      enum: SUBSCRIPTION_DURATIONS,
      required: true,
      default: "1M"
    },
    durationByDays: {
      type: Number,
      required: true,
      default: 30
    },
    price: {
      type: Number,
      default: 0,
      required: true
    },
    discount: {
      type: Number,
      default: 0,
      required: true
    },
    subscribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "dealers",
      required: false
    },
    startDate: {
      type: Date,
      required: false
    },
    endDate: {
      type: Date,
      required: false
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("subscriptions", SubscriptionSchema);
