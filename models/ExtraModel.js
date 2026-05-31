const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const SubscriptionDataModel = require('../commonModels/SubscriptionDataModel')

const ExtraModel = new Schema({
    name:{
        type:String,
        require:true
    },
    seq:{
        type:Number,
        require:false       
    },
    list:{
        type:[String],
        require:false       
    },
    subscriptions:{
        type:[SubscriptionDataModel],
        default:[],
        require: true,
    },
    dealerSupport:{
        type:String,
        require:false
    },
    userSupport:{
        type:String,
        require:false
    }
},{ versionKey: false, timestamps: true })

module.exports = mongoose.model('extras',ExtraModel)