const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const PaymentDetailsModel  = new Schema({
    paymentName:{
        type:String,
        require:true,        
    },
    amount:{
        type:Number,
        require:true,        
    }
},{ versionKey: false, timestamps: true })

module.exports = PaymentDetailsModel