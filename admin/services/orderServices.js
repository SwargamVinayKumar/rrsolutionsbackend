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
const ProductModel = require('../../models/ProductModel');


class OrderServices {




async fetchOrders(body, tokenDetails) {
    try {
      const { search, dealerId, orderStatus, limit, currentPage, startDate, endDate } = body
      const validatorResponse = validator.validate(['dealerId', 'orderStatus', 'limit', 'currentPage'], body)
      if (validatorResponse != null) throw validatorResponse
      const escapedSearch = validator.escapeRegex(search);

      // Build the base query
      const findQuery = {};
      
      // Add dealerId filter if not "all"
      if (dealerId && dealerId !== "all") {
        findQuery.dealerId = dealerId;
      }
      
      // Add orderStatus filter if not "all"
      if (orderStatus && orderStatus !== "all") {
        findQuery.orderStatus = orderStatus;
      }
      
      // Add date range filter if startDate and/or endDate are provided
      if (startDate || endDate) {
        findQuery.createdAt = {};
        
        if (startDate) {
          const startOfDay = new Date(startDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          findQuery.createdAt.$gte = startOfDay;
        }
        
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          findQuery.createdAt.$lte = endOfDay;
        }
      }

      // Add search filter if provided
      if (search && search !== "") {
        findQuery.$and = [
          { ...findQuery },
          {
            $or: [
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$_id" },
                    regex: escapedSearch,
                    options: "i"
                  }
                }
              },
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$customerMobile" },
                    regex: escapedSearch,
                    options: "i"
                  }
                }
              }
            ]
          }
        ];
        // Remove the original properties since they're now in $and
        if (findQuery.dealerId) delete findQuery.dealerId;
        if (findQuery.orderStatus) delete findQuery.orderStatus;
        if (findQuery.createdAt) delete findQuery.createdAt;
      }

      console.log(findQuery)

      const docCount = await OrdersModel.countDocuments(findQuery);
      const skip = (currentPage - 1) * limit;
      const pageCount = Math.ceil(docCount / limit);

      // Get orders with populate
      const response = await OrdersModel
        .find(findQuery)
        .select({ orderDetails: 1, orderStatus: 1, createdAt: 1, updatedAt: 1, payments: 1,customerMobile:1,calculatedFare:1})
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      // Manually populate and limit orderDetails to first 5
      const populatedOrders = await Promise.all(
        response.map(async (order) => {
          // Take only first 5 orderDetails
          const limitedOrderDetails = order.orderDetails?.slice(0, 5) || [];

          // Populate productId for each limited orderDetail
          const populatedOrderDetails = await Promise.all(
            limitedOrderDetails.map(async (detail) => {
              const productDetails = detail.productId 
                ? await ProductModel.findById(detail.productId).select({ name: true, metricUnit: true, quantity: true }).lean() 
                : null;

              return {
                ...detail,
                productDetails
              };
            })
          );

          return {
            ...order,
            orderDetails: populatedOrderDetails
          };
        })
      );

      return {
        status: STATUS_SUCCESS,
        message: "Orders Fetched Successfully",
        data: {
          pageCount: pageCount,
          orders: populatedOrders
        }
      }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async fetchOrderDetails(body, tokenDetails) {
    try {
      const { orderId } = body;
      const validatorResponse = validator.validate(['orderId'], body);
      if (validatorResponse) throw validatorResponse;
      const orderDetails = await OrdersModel.findOne({ _id: orderId }).populate('dealerId', 'name businessLogo businessName mobile email').populate('orderDetails.productId', 'name productImage metricUnit quantity').populate('orderDetails.inventoryId', 'productId mrp retailPrice wholesalePrice').lean();

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