const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const LocationModel =  new Schema({
    address1:{
        type:String,
        require:true
    },
    address2:{
        type:String,
        require:true
    },
    city:{
        type:String,
        require:true
    },
    state:{
        type:String,
        require:true
    },
    landMark:{
        type:String,
        require:true
    },
    pinCode:{
        type:Number,
        require:true
    },
    latitude:{
        type:Number,
        require:true
    },
    longitude:{
        type:Number,
        require:true
    }
},{ versionKey: false, timestamps: true })

module.exports = LocationModel;