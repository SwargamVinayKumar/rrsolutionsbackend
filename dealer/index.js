const express =  require('express');
const router = express.Router()

const AuthServices = require('../dealer/services/authServices')
const ProductServices = require('../dealer/services/productServices')
const OrderServices = require('./services/orderServices');

const authServices = new AuthServices();
const productServices = new ProductServices();
const orderServices = new OrderServices();


//mobile

const MAuthServices = require('../dealer/mobileServices/authServices')
const MOrderServices = require('../dealer/mobileServices/orderServices')


const mAuthServices = new MAuthServices();
const mOrderServices = new MOrderServices();


const MiddleWare = require('../extensions/MiddleWare');
const middleWear = new MiddleWare()



router.post('/testUdfFields',async (req,res) => {
    const response = await authServices.testUdfFields(req.body)
    res.send(response)
})

router.post('/testing',async (req,res) => {
    const response = await authServices.invoiceTestUdfFields(req.body)
    res.send(response)
})



router.post('/uploadFile',async (req,res) => {
    const response = await authServices.uploadFile(req)
    console.log(response)
    res.send(response)
})

router.post('/signup',async ({ body },res) => {
    const response = await authServices.signUp(body)
    res.send(response)
})


router.post('/getProfile',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await authServices.getProfile(body,tokenDetails)
    res.send(response)
})

router.post('/fetchBanners',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await authServices.fetchBanners(body,tokenDetails)
    res.send(response)
})

router.post('/fetchStats',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await authServices.fetchStats(body,tokenDetails)
    res.send(response)
})



router.post('/fetchSubscriptions',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await authServices.fetchSubscriptions(body,tokenDetails)
    res.send(response)
})

router.post('/performSubscription',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await authServices.performSubscription(body,tokenDetails)
    res.send(response)
})

router.post('/updateSubscriptionStatus',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await authServices.updateSubscriptionStatus(body,tokenDetails)
    res.send(response)
})





//products
router.post('/fetchSupplieProducts',middleWear.validateDealer,async ({ body },res) => {
    const response = await productServices.fetchSupplieProducts(body)
    res.send(response)
})

router.post('/fetchInventoryProducts',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await productServices.fetchInventoryProducts(body,tokenDetails)
    res.send(response)
})

router.post('/fetchSingleProductByHSN',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await productServices.fetchSingleProductByHSN(body,tokenDetails)
    res.send(response)
})

router.post('/updateInventoryPricing',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await productServices.updateInventoryPricing(body,tokenDetails)
    res.send(response)
})


router.post('/fetchOrders',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await orderServices.fetchOrders(body,tokenDetails)
    res.send(response)
})

router.post('/fetchOrderDetails',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await orderServices.fetchOrderDetails(body,tokenDetails)
    res.send(response)
})

router.post('/updateOrderDetails',middleWear.validateDealer,async ({ body,tokenDetails},res) => {
    const response = await orderServices.updateOrderDetails(body,tokenDetails)
    res.send(response)
})





//mobile services
router.post('/mobile/getProfile',async ({ body },res) => {
    const response = await mAuthServices.getProfile(body)
    res.send(response)
})

router.post('/mobile/scanProduct',async ({ body },res) => {
    const response = await mOrderServices.fetchSingleProductByHSN(body)
    res.send(response)
})

router.post('/mobile/placeOrder',async ({ body },res) => {
    const response = await mOrderServices.placeOrder(body)
    console.log(response);
    res.send(response)
})

router.post('/mobile/viewOrderDetails',async ({ body },res) => {
    const response = await mOrderServices.viewOrderDetails(body)
    console.log(response);
    res.send(response)
})






module.exports = router
