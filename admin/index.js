const express =  require('express');
const router = express.Router()

const AuthServices = require('../admin/services/authServices')
const DealerServices = require('../admin/services/dealerServices')
const ProductServices = require('../admin/services/productServices')
const OrderServices = require('../admin/services/orderServices')


const authServices = new AuthServices();
const dealerServices =  new DealerServices();
const productServices = new ProductServices();
const orderServices = new OrderServices();


const MiddleWare = require('../extensions/MiddleWare');
const middleWear = new MiddleWare()







router.post('/login',async ({ body },res) => {
    const response = await authServices.login(body)
    res.send(response)
})

router.post('/lead',async ({ body },res) => {
    const response = await authServices.lead(body)
    res.send(response)
})



router.post('/uploadFile',async (req,res) => {
    const response = await authServices.uploadFile(req)
    res.send(response)
})

router.post('/fetchStats',middleWear.validateAdmin,async ({ body,tokenDetails},res) => {
    const response = await authServices.fetchStats(body,tokenDetails)
    res.send(response)
})


router.post('/fetchBanners',middleWear.validateAdmin,async ({ body },res) => {
    const response = await authServices.fetchBanners(body)
    res.send(response)
})

router.post('/updateBanners',middleWear.validateAdmin,async ({ body },res) => {
    const response = await authServices.updateBanners(body)
    res.send(response)
})

router.post('/fetchSubscriptionData',middleWear.validateAdmin,async ({body},res) => {
    const response = await authServices.fetchSubscriptionData(body)
    res.send(response)
})


router.post('/fetchSubscriptions',middleWear.validateAdmin,async ({body},res) => {
    const response = await authServices.fetchSubscriptions(body)
    res.send(response)
})

router.post('/updateSubscription',middleWear.validateAdmin,async ({body},res) => {
    const response = await authServices.updateSubscriptionData(body)
    res.send(response)
})

router.post('/addSubscription',middleWear.validateAdmin, async ({body},res) => {
    const response = await authServices.addSubscription(body)
    res.send(response)
})

router.post('/deleteSubscription',middleWear.validateAdmin, async ({body},res) => {
    const response = await authServices.deleteSubscription(body)
    res.send(response)
})

//dealerServices 
router.post('/fetchDealers',middleWear.validateAdmin,async ({ body },res) => {
    const response = await dealerServices.fetchDealers(body)
    res.send(response)
})

router.post('/fetchDealerDetails',middleWear.validateAdmin,async ({ body },res) => {
    const response = await dealerServices.fetchDealerDetails(body)
    res.send(response)
})

router.post('/updateBusinessApprovalStatus',middleWear.validateAdmin,async ({ body },res) => {
    const response = await dealerServices.updatBusinessApprovalStatus(body)
    res.send(response)
})

router.post('/fetchDealerStats',middleWear.validateAdmin,async ({ body },res) => {
    const response = await dealerServices.fetchDealerStats(body)
    res.send(response)
})

router.post('/fetchTrialDealers',middleWear.validateAdmin,async ({ body },res) => {
    const response = await dealerServices.fetchTrialDealers(body)
    res.send(response)
})

router.post('/fetchTrialDealersCount',middleWear.validateAdmin,async (req,res) => {
    const response = await dealerServices.fetchTrialDealersCount()
    res.send(response)
})

router.post('/fetchInventoryProducts',middleWear.validateAdmin,async ({ body,tokenDetails},res) => {
    const response = await dealerServices.fetchInventoryProducts(body,tokenDetails)
    res.send(response)
})

router.post('/fetchSingleProductByHSN',middleWear.validateAdmin,async ({ body,tokenDetails},res) => {
    const response = await dealerServices.fetchSingleProductByHSN(body,tokenDetails)
    res.send(response)
})

router.post('/updateInventoryPricing',middleWear.validateAdmin,async ({ body,tokenDetails},res) => {
    const response = await dealerServices.updateInventoryPricing(body,tokenDetails)
    res.send(response)
})

//orders
router.post('/fetchOrders',middleWear.validateAdmin,async ({ body,tokenDetails},res) => {
    const response = await orderServices.fetchOrders(body,tokenDetails)
    res.send(response)
})

router.post('/fetchOrderDetails',middleWear.validateAdmin,async ({ body,tokenDetails},res) => {
    const response = await orderServices.fetchOrderDetails(body,tokenDetails)
    res.send(response)
})




//product services

router.post('/createSupplieProduct',middleWear.validateAdmin,async ({ body },res) => {
    const response = await productServices.createSupplieProduct(body)
    res.send(response)
})

router.post('/updateSupplieProduct',middleWear.validateAdmin,async ({ body },res) => {
    const response = await productServices.updateSupplieProduct(body)
    res.send(response)
})

router.post('/fetchSupplieProducts',middleWear.validateAdmin,async ({ body },res) => {
    const response = await productServices.fetchSupplieProducts(body)
    res.send(response)
})

router.post('/updateProductBlocking',middleWear.validateAdmin,async ({ body },res) => {
    const response = await productServices.updateProductBlocking(body)
    res.send(response)
})





module.exports = router
