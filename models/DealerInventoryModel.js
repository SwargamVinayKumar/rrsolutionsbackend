const mongoose = require('mongoose');
const { METRIC_UNITS } = require('../config/api');
const Schema = mongoose.Schema;


const DealetInventoryModel = new Schema({
    dealerId: {
        type: mongoose.Types.ObjectId,
        ref: 'dealers',
        required: true
    },
    productId: {
        type: mongoose.Types.ObjectId,
        ref: 'products',
        required: true
    },
    mrp: {
        type: Number,
        required: true
    },
    wholesalePrice: {
        type: Number,
        required: true
    },
    retailPrice: {
        type: Number,
        required: true
    },
    dealerPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    stock: {
        type: Number,
        required: true
    }
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('inventory', DealetInventoryModel);