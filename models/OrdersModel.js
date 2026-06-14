const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const { METRIC_UNITS } = require('../config/api');

const Validator = require('../extensions/Validator');
const PaymentDetailsModel = require('../commonModels/PaymentDetailsModel');

const OrderDetails = require('../commonModels/OrderDetails')

const OrdersModel = new Schema({
    orderStatus: {
        type: String,
        enum: ["onrequest","ongoing",'oncredit',"rejected", "completed","returned"],
        require: true,
        default: "onrequest"
    },
    dealerId: {
        type: mongoose.Types.ObjectId,
        ref: 'dealers',
        required: true
    },
    customerName:{
        type: String,
        required: false
    },
    customerMobile:{
        type: String,
        required: false
    },
    orderDetails: {
        type: [OrderDetails],
        require: true
    },
    payments: {
        type: [{ type: PaymentDetailsModel }],
        require: false
    },
    calculatedAs: {
        type: String,
        enum: ["retail", "wholesale"],
        default: "retail",
        require: true
    },
    itemsTotal: {
        type: Number,
        require: true
    },
    couponDiscount: {
        type: Number,
        require: false,
        default: 0
    },
    tax: {
        type: Number,
        require: false,
        default: 0
    },
    totalMrpPrice: {
        type: Number,
        require: true
    },
    totalDealerPrice: {
        type: Number,
        require: true
    },
    totalRetailPrice: {
        type: Number,
        require: true
    },
    totalWholesalePrice: {
        type: Number,
        require: true
    },
    calculatedFare:{
        type: Number,
        require: true
    }
}, { versionKey: false, timestamps: true })

module.exports = mongoose.model('orders', OrdersModel)