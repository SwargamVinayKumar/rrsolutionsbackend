const { STATUS_SUCCESS, STATUS_FAILED, APPROVAL_STATUS } = require('../../config/api')
const jwtToken = require('jsonwebtoken')
const Validator = require('../../extensions/Validator')
const validator = new Validator();
const DealerModel = require('../../models/DealerModel')
const OrdersModel = require('../../models/OrdersModel')
const SupplieProductModel = require('../../models/ProductModel');
const secretKey = process.env.ADMIN_SECRET_KEY
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId;
const ExtraModel = require('../../models/ExtraModel')
const moment = require('moment-timezone');
const Notification = require('../../extensions/Notification');
const DealerInventoryModel = require('../../models/DealerInventoryModel');
const notification = new Notification();


class DealerServices {

  async fetchDealers(body) {
    try {
      const { search, approvalStatus, limit, currentPage } = body
      const validatorResponse = validator.validate(['approvalStatus', 'limit', 'currentPage'], body)
      if (validatorResponse != null) throw validatorResponse
      const escapedSearch = validator.escapeRegex(search);

      let approvalFindQuery = approvalStatus == "all" ? {} : { approvalStatus: approvalStatus };

      const findQuery = search == null || search === "" ? { ...approvalFindQuery } : {
        $and: [
          { ...approvalFindQuery },
          {
            $or: [
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$mobile" },
                    regex: escapedSearch,
                    options: "i"
                  }
                }
              },
              { "name": { $regex: escapedSearch, $options: "i" } },
              { "companyName": { $regex: escapedSearch, $options: "i" } },
              { "location.address1": { $regex: escapedSearch, $options: "i" } },
              { "availableSupplies.name": { $regex: escapedSearch, $options: "i" } }
            ]
          }
        ]
      }

      console.log("ejbn")

      const docCount = await DealerModel.countDocuments(findQuery);
      const skip = (currentPage - 1) * limit;
      let pageCount;
      if (docCount % limit === 0) {
        pageCount = docCount / limit;
      } else {
        pageCount = Math.floor(docCount / limit) + 1;
      }

      const reponse = await DealerModel.find(findQuery).select({ approvalStatus: true, companyName: true, companyImage: true, name: true, email: true, mobile: true, createdAt: true, reason: true }).skip(skip).limit(limit).sort({ createdAt: -1 }).lean()
      return {
        status: STATUS_SUCCESS, message: "Dealers Fetched Successfully", data: {
          pageCount: pageCount,
          dealers: reponse
        }
      }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async fetchDealerDetails(body) {
    try {
      const { dealerId } = body
      const validatorResponse = validator.validate(['dealerId'], body)
      if (validatorResponse != null) throw validatorResponse
      const reponse = await DealerModel.findOne({ _id: dealerId }).populate("subscription").lean();
      if (!reponse) throw "Invalid dealerID"
      return { status: STATUS_SUCCESS, message: "Details Fetched Successfully", data: reponse }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async updatBusinessApprovalStatus(body) {
    try {
      const { approvalStatus, reason = "", dealerId } = body;
      if (!APPROVAL_STATUS.includes(approvalStatus)) throw "Invalid Approval Status";
      const validate = approvalStatus == "approved" ? ['approvalStatus', 'dealerId'] : ['approvalStatus', 'reason', 'dealerId']
      const validatorResponse = validator.validate(validate, body)
      if (validatorResponse != null) throw validatorResponse

      const updateResponse = await DealerModel.findOneAndUpdate({ _id: dealerId }, { approvalStatus: approvalStatus, reason: reason }, { upsert: true })
      if (!updateResponse) throw "some thing went wrong or invalid dealerId"
      return { status: STATUS_SUCCESS, message: `Dealer ${approvalStatus != "approved" ? "Approval Canceled" : "Approved"} Successfully`, updateResponse }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async fetchDealerStats(body) {
    try {
      const { date, dealerId } = body;
      if (!mongoose.Types.ObjectId.isValid(dealerId)) throw "Invalid Dealer Id"
      const dateFormatRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      const inputDate = moment.utc(date).startOf("day");
      const startDate = inputDate.toDate()
      const endDate = moment.utc(date).endOf("day").toDate();
      const dateQuery = dateFormatRegex.test(date) ? { createdAt: { $gte: startDate, $lt: endDate } } : {};
      const query = { dealerId: new ObjectId(dealerId), ...dateQuery };

      const inventoryCount = await DealerInventoryModel.countDocuments({ _id: dealerId });

      const totalOrders = await OrdersModel.countDocuments(query);
      const onRequestOrders = await OrdersModel.countDocuments({ orderStatus: "onrequest", ...query });
      const onGoingOrders = await OrdersModel.countDocuments({ orderStatus: "ongoing", ...query });
      const completedOrders = await OrdersModel.countDocuments({ orderStatus: "completed", ...query });
      const rejectedOrders = await OrdersModel.countDocuments({ orderStatus: "rejected", ...query });

      const retailOrders = await OrdersModel.countDocuments({ orderStatus: "completed", ...query,calculatedAs:"retail"});
      const wholesaleOrders = await OrdersModel.countDocuments({ orderStatus: "completed", ...query,calculatedAs:"wholesale"});


      const completedOrdersAggregation = await OrdersModel.aggregate([
        {
          $match: {
            orderStatus: "completed",
            ...query  // Your additional query conditions
          }
        },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalFare: { $sum: "$calculatedFare" }
          }
        }
      ]);

      const result = completedOrdersAggregation[0] || { totalCount: 0, totalFare: 0 };
      const completedOrdersCount = result.totalCount;
      const totalCalculatedFare = result.totalFare;


      const ordersData = [
        {
          title: "Inventory Count",
          value: inventoryCount
        },
        {
          title: "Total Order",
          value: totalOrders
        },
        {
          title: "Requested Order",
          value: onRequestOrders
        },
        {
          title: "Ongoing Orders",
          value: onGoingOrders
        },
        {
          title: "Rejected Ordets",
          value: rejectedOrders
        },
        {
          title: "Completed Orders",
          value: completedOrders
        },
        {
          title: "Retail Orders",
          value: retailOrders
        },
        {
          title: "Wholesale Orders",
          value: wholesaleOrders
        },
        {
          title: "Sale",
          value: totalCalculatedFare
        }
      ]

      return { status: STATUS_SUCCESS, message: "Stats Fetched Successfully", data: ordersData }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async fetchInventoryProducts(body) {
    try {
      const { dealerId, limit, currentPage, search } = body
      const validatorResponse = validator.validate(['limit', 'currentPage'], body)
      if (validatorResponse != null) throw validatorResponse

      const escapedSearch = validator.escapeRegex(search);

      const searchQuery = search != null && search !== "" ? {
        $or: [
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$hsnCode" },
                regex: escapedSearch,
                options: "i"
              }
            }
          },
          { "name": { $regex: escapedSearch, $options: "i" } },
          { "bio": { $regex: escapedSearch, $options: "i" } },
          { "metricUnit": { $regex: escapedSearch, $options: "i" } }
        ]
      } : {};

      const docCount = await SupplieProductModel.countDocuments(searchQuery);
      const skip = (currentPage - 1) * limit;
      let pageCount;
      if (docCount % limit === 0) {
        pageCount = docCount / limit;
      } else {
        pageCount = Math.floor(docCount / limit) + 1;
      }
      const reponse = await SupplieProductModel.find(searchQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()


      const prosuctsIds = reponse.map(item => item._id);

      const inventoryData = await DealerInventoryModel.find({ dealerId: dealerId, productId: { $in: prosuctsIds } }).lean();

      const finalResponse =
        reponse.map(item => {
          const inventoryInfo = inventoryData.find(inventory => inventory.productId.toString() === item._id.toString());
          return {
            ...item,
            inventoryInfo: inventoryInfo ? {
              mrp: inventoryInfo.mrp,
              wholesalePrice: inventoryInfo.wholesalePrice,
              retailPrice: inventoryInfo.retailPrice,
              dealerPrice: inventoryInfo.dealerPrice,
              discount: inventoryInfo.discount,
              stock: inventoryInfo.stock
            } : null
          };
        });

      return {
        status: STATUS_SUCCESS, message: "Products Fetched Successfully", data: {
          pageCount: pageCount,
          products: finalResponse
        }
      }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async fetchSingleProductByHSN(body) {
    try {
      const { dealerId, hsnCode } = body;

      // ✅ Validation
      const validatorResponse = validator.validate(['dealerId', 'hsnCode'], body);
      if (validatorResponse != null) throw validatorResponse;

      const pipeline = [
        {
          $match: {
            dealerId: mongoose.Types.ObjectId(dealerId)
          }
        },
        {
          $lookup: {
            from: "products", // 🔥 use your actual collection name
            localField: "productId",
            foreignField: "_id",
            as: "productId"
          }
        },
        {
          $unwind: "$productId"
        },
        {
          $match: {
            $expr: {
              $eq: [
                { $toString: "$productId.hsnCode" },
                hsnCode.toString()
              ]
            }
          }
        },
        {
          $limit: 1
        }
      ];

      const result = await DealerInventoryModel.aggregate(pipeline);

      if (!result || result.length === 0) {
        throw new Error("Product is not listed in our store");
      }

      return {
        status: STATUS_SUCCESS,
        message: "Product fetched successfully",
        data: result[0]
      };

    } catch (err) {
      return {
        status: STATUS_FAILED,
        message: err.message || err + ""
      };
    }
  }

  async updateInventoryPricing(body) {
    try {
      const { dealerId, productId, mrp, wholesalePrice, retailPrice, dealerPrice, discount = 0, stock } = body
      const validatorResponse = validator.validate(['dealerId', 'productId', 'mrp', 'wholesalePrice', 'retailPrice', 'dealerPrice', 'stock'], body)
      if (validatorResponse != null) throw validatorResponse


      const productExist = await SupplieProductModel.findOne({ _id: productId }).lean();

      if (productExist == null) throw "Invalid Product Id";
      if (productExist?.isBlocked == true) throw "Product is blocked by admin, Please contact support for more details";

      const dealerExist = await DealerModel.findOne({ _id: dealerId }).lean();

      if (!dealerExist) throw "Invalid Dealer Id";
      if (dealerExist?.approvalStatus !== "approved") throw `Dealer is ${dealerExist?.approvalStatus} by admin`;



      const inventoryExist = await DealerInventoryModel.findOne({ dealerId, productId }).lean();

      let savedResponse;
      if (inventoryExist) {
        savedResponse = await DealerInventoryModel.findOneAndUpdate({ dealerId, productId }, { mrp, wholesalePrice, retailPrice, dealerPrice, discount, stock }, { new: true }).lean()
      }
      else {
        const dealerInventoryModel = new DealerInventoryModel({
          dealerId,
          productId,
          mrp,
          wholesalePrice,
          retailPrice,
          dealerPrice,
          discount,
          stock
        }
        )
        savedResponse = await dealerInventoryModel.save();
      }

      return {
        status: STATUS_SUCCESS, message: "Inventory Detauls Saved Successfully", data: savedResponse
      }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }

  }


}

module.exports = DealerServices;