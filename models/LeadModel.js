const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LeadModel = new Schema({
    businessName: {
        type: String,
        required: true
    },
    businessType: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    source: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,  // Changed from String to Date for TTL index
        required: true,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 3 * 24 * 60 * 60 * 1000) // 3 days from creation
    }
}, { 
    versionKey: false, 
    timestamps: true 
});


LeadModel.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


module.exports = mongoose.model('leads', LeadModel);