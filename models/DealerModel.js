const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const LocationModel = require('../commonModels/LocationModel')


const Validator = require('../extensions/Validator');
const {APPROVAL_STATUS} = require('../config/api')


const validator = new Validator();


const DealerModel  = new Schema({
    approvalStatus:{
        type:String,
        enum:APPROVAL_STATUS,
        default:"pending",
        require:false,        
    },
    reason:{
        type:String,
        require:true,
        default:""        
    },
    mobile:{
        type:Number,
        require:false,
        validate:validator.mobileValidator,
        unique:false
    },
    name:{
        type:String,
        require:false
    },
    email: {
        type: String,
        required: false,
        validate: validator.emailValidator,
        unique:true
    },
    password:{
        type:String,
        require:false
    },
    businessLogo:{
        type:String,
        require:false       
    },
    businessLicence:{
        type:String,
        require:false       
    },
    businessName:{
        type:String,
        require:false
    },
    aboutBusiness:{
        type:String,
        require:false
    },
    gstIn:{
        type:String,
        require:false        
    },
    fssaiId:{
        type:String,
        require:false        
    },
    location:{
        type:LocationModel,
        require:false
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subscriptions",
        required: false
    },
},{ versionKey: false, timestamps: true })

module.exports = mongoose.model('dealers',DealerModel)