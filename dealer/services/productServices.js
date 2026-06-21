const { STATUS_SUCCESS, STATUS_FAILED, METRIC_UNITS } = require('../../config/api')
const Validator = require('../../extensions/Validator')
const validator = new Validator();

const SupplieProductModel = require('../../models/ProductModel');

const secretKey = process.env.ADMIN_SECRET_KEY
const mongoose = require('mongoose')
const ExtraModel = require('../../models/ExtraModel')
const moment = require('moment-timezone');
const DealerInventoryModel = require('../../models/DealerInventoryModel');
const DealerModel = require('../../models/DealerModel');


class ProductServices {


  

  async fetchSupplieProducts(body) {
    try {
      const { limit, currentPage } = body
      const validatorResponse = validator.validate(['limit', 'currentPage'], body)
      if (validatorResponse != null) throw validatorResponse
      const searchQuery = {}
      const docCount = await SupplieProductModel.countDocuments(searchQuery);
      const skip = (currentPage - 1) * limit;
      let pageCount;
      if (docCount % limit === 0) {
        pageCount = docCount / limit;
      } else {
        pageCount = Math.floor(docCount / limit) + 1;
      }
      const reponse = await SupplieProductModel.find(searchQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
      return {
        status: STATUS_SUCCESS, message: "Products Fetched Successfully", data: {
          pageCount: pageCount,
          products: reponse
        }
      }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }


  async fetchInventoryProducts(body,tokenDetails) {
      try {
        const {id} = tokenDetails
        const dealerId = id;
        const {limit, currentPage, search } = body
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

        const inventoryData = await DealerInventoryModel.find({ dealerId : dealerId, productId: { $in: prosuctsIds } }).lean();

        const finalResponse =
          reponse.map(item => {
            const inventoryInfo = inventoryData.find(inventory => inventory.productId.toString() === item._id.toString());
            return {
              ...item,
              inventoryInfo: inventoryInfo ? {
                _id: inventoryInfo._id,
                productId: inventoryInfo.productId,
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

  async fetchSingleProductByHSN(body,tokenDetails) {
    try {
      const {id} = tokenDetails;
      const dealerId = id;
      const { hsnCode } = body;

      // ✅ Validation
      const validatorResponse = validator.validate(['hsnCode'], body);
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

  async updateInventoryPricing(body,tokenDetails) {
    try {
      const {id} = tokenDetails;
      const dealerId = id;
      const {productId, mrp, wholesalePrice, retailPrice, dealerPrice, discount = 0, stock } = body
      const validatorResponse = validator.validate(['productId', 'mrp', 'wholesalePrice', 'retailPrice', 'dealerPrice', 'stock'], body)
      if (validatorResponse != null) throw validatorResponse


      const productExist = await SupplieProductModel.findOne({ _id: productId }).lean();

      if(productExist == null) throw "Invalid Product Id";
      if(productExist?.isBlocked == true) throw "Product is blocked by admin, Please contact support for more details";

      const dealerExist = await DealerModel.findOne({ _id: dealerId }).lean();

      if(!dealerExist) throw "Invalid Dealer Id";
      if(dealerExist?.approvalStatus !== "approved") throw `Dealer is ${dealerExist?.approvalStatus} by admin`;



      const inventoryExist = await DealerInventoryModel.findOne({ dealerId,productId }).lean();

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

module.exports = ProductServices;