const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const { METRIC_UNITS } = require('../config/api')

const OrderDetails = new Schema({
    productId: {
        type: mongoose.Types.ObjectId,
        ref: 'products',
        required: true
    },
    inventoryId: {
        type: mongoose.Types.ObjectId,
        ref: 'inventory',
        required: true
    },
    count: {
        type: Number,
        require: false,
    }
}, { versionKey: false, timestamps: true })

module.exports = OrderDetails;