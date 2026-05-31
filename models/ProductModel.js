const mongoose = require('mongoose');
const {METRIC_UNITS} = require('../config/api');
const Schema = mongoose.Schema

const ProductModel = new Schema({
    image:{
        type:String,
        require:true        
    },
    name:{
        type:String,
        require:true
    },
    bio:{
        type:String,
        require:true
    },
    metricUnit:{
        type:String,
        require:true,
        enum:METRIC_UNITS
    },
    quantity:{
        type:Number,
        require:true
    },
    hsnCode:{
        type:Number,
        require:true,
        unique:true
    },
    isBlocked:{
        type:Boolean,
        require:false     
    }
},{ versionKey: false, timestamps: true }) 

module.exports = mongoose.model('products',ProductModel)