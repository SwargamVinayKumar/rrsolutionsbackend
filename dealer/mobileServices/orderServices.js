const { STATUS_SUCCESS, STATUS_FAILED, METRIC_UNITS } = require('../../config/api')
const Validator = require('../../extensions/Validator')
const validator = new Validator();

const SupplieProductModel = require('../../models/ProductModel');

const secretKey = process.env.ADMIN_SECRET_KEY
const mongoose = require('mongoose')
const ExtraModel = require('../../models/ExtraModel')
const moment = require('moment-timezone');
const DealerInventoryModel = require('../../models/DealerInventoryModel');
const OrdersModel = require('../../models/OrdersModel');


class OrderServices {


  async fetchSingleProductByHSN(body) {
    try {
      const { dealerId, hsnCode } = body;

      // ✅ Validation
      const validatorResponse = validator.validate(['dealerId', 'hsnCode'], body);
      if (validatorResponse != null) throw validatorResponse;

      console.log(hsnCode)

      const product = await SupplieProductModel.findOne({ hsnCode }).lean();

      if (!product) throw "Product Not Found";


      const result = await DealerInventoryModel.findOne({ productId: product._id, dealerId: new mongoose.Types.ObjectId(dealerId) }).select({ productId: false }).lean();


      const productDetails = {
        productId: product,
        ...result
      }


      return {
        status: STATUS_SUCCESS,
        message: "Product fetched successfully",
        data: productDetails
      };

    } catch (err) {
      return {
        status: STATUS_FAILED,
        message: err.message || String(err)
      };
    }
  }

  async cartDetails(body) {
    try {

      const { dealerId, items } = body;
      const validatorResponse = validator.validate(['dealerId', 'items'], body);
      if (validatorResponse) throw validatorResponse;
      items.forEach(item => {
        if (!item.productId || !item.count) {
          throw new Error("Invalid item format in cart");
        }
      });
      const productIds = items.map(item => mongoose.Types.ObjectId(item.productId));
      const products = await DealerInventoryModel.find({ productId: { $in: productIds }, dealerId: mongoose.Types.ObjectId(dealerId) }).populate('productId').select({ wholesalePrice: false, stock: false }).lean();

      return {
        status: STATUS_SUCCESS,
        message: "Cart details fetched successfully",
        data: {
          products: products.map(product => {
            const item = items.find(i => i.productId === product.productId._id.toString());
            return {
              ...product,
              count: item ? item.count : 0
            }
          }),
          totalMrp: products.reduce((total, product) => {
            const item = items.find(i => i.productId === product.productId._id.toString());
            return total + (product.productId.mrp * (item ? item.count : 0));
          }, 0),
          totalRetailPrice: products.reduce((total, product) => {
            const item = items.find(i => i.productId === product.productId._id.toString());
            return total + (product.productId.retailPrice * (item ? item.count : 0));
          }, 0)
        }
      }
    }
    catch (err) {
      return {
        status: STATUS_FAILED,
        message: err.message || err + ""
      }
    }
  }

  async calculateTotals(items) {
    
    const ids = items.map(i => new mongoose.Types.ObjectId(i.inventoryId));

    // Fetch inventory docs
    const inventories = await DealerInventoryModel.find({ _id: { $in: ids } });

    let totals = {
      totalMrpPrice: 0,
      totalDealerPrice: 0,
      totalRetailPrice: 0,
      totalWholesalePrice: 0
    };

    inventories.forEach(inv => {
      const item = items.find(i => i.inventoryId == inv._id.toString());
      const count = item?.count || 0;

      totals.totalMrpPrice += inv.mrp * count;
      totals.totalDealerPrice += inv.dealerPrice * count;
      totals.totalRetailPrice += inv.retailPrice * count;
      totals.totalWholesalePrice += inv.wholesalePrice * count;
    });

    return totals;
  }


  async placeOrder(body) {

    try {
      const { dealerId, orderDetails } = body;
      const validatorResponse = validator.validate(['dealerId', 'orderDetails'], body);

      const itemsTotal = orderDetails.reduce((total, item) => total + item.count, 0);
      const totalCalculated = await this.calculateTotals(orderDetails);

      const saveOrder = new OrdersModel({
        orderStatus:"onrequest",
        dealerId,
        orderDetails,
        itemsTotal,
        couponDiscount:0,
        tax:0,
        payments:[],
        calculatedAs:"retail",
        ...totalCalculated,
        calculatedFare:totalCalculated.totalRetailPrice
      });

      const result = await saveOrder.save();
      
      return {
        status: STATUS_SUCCESS,
        message: "Order placed successfully",
        data: {
          _id: result?._id
        }
      }
    }
    catch (err) {
      return {
        status: STATUS_FAILED,
        message: err.message || err + ""
      }
    }
  }

  async viewOrderDetails(body) {
    try {
      const { orderId } = body;
      const validatorResponse = validator.validate(['orderId'], body);
      if (validatorResponse) throw validatorResponse;
      const orderDetails = await OrdersModel.findById(orderId).populate('dealerId', 'name businessLogo businessName mobile email').populate('orderDetails.productId', 'name productImage metricUnit quantity').populate('orderDetails.inventoryId', 'productId mrp retailPrice wholesalePrice').lean();

      return {
        status: STATUS_SUCCESS,
        message: "Order details fetched successfully",
        data: orderDetails
      }
    }
    catch (err) {
      return {
        status: STATUS_FAILED,
        message: err.message || err + ""
      }
    }
  }



}

module.exports = OrderServices;