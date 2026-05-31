const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const {SUBSCRIPTION_DURATIONS,MEMBERSHIP_TYPES} = require('../config/api');


const SubscriptionDataModel =  new Schema({
    name: {
      type: String,
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
      required: true
    },
    discount: {
      type: Number,
      required: true
    },
    isActive:{
      type: Boolean,
      default: true,
      required: true
    },
    list:{
      type: [],
      default: [],
      required: true
    }
},{ versionKey: false, timestamps: true })


module.exports = SubscriptionDataModel;