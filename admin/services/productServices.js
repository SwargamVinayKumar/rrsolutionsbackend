const { STATUS_SUCCESS, STATUS_FAILED, METRIC_UNITS } = require('../../config/api')
const Validator = require('../../extensions/Validator')
const validator = new Validator();

const SupplieProductModel = require('../../models/ProductModel');

const secretKey = process.env.ADMIN_SECRET_KEY
const mongoose = require('mongoose')
const ExtraModel = require('../../models/ExtraModel')
const moment = require('moment-timezone');


class ProductServices {

  async createSupplieProduct(body) {
    try {
      const { image, name, bio, metricUnit, quantity, hsnCode } = body
      const validatorResponse = validator.validate(['image', 'name', 'bio', 'metricUnit', 'quantity', 'hsnCode'], body)
      if (validatorResponse != null) throw validatorResponse
      if (!METRIC_UNITS.includes(metricUnit)) throw "Invalid Metric Unit"

      const supplieProductModel = new SupplieProductModel({
        ...body
      })
      const savedResponse = await supplieProductModel.save()
      return { status: STATUS_SUCCESS, message: "Product Created Successfully", data: savedResponse }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async updateSupplieProduct(body) {
    try {
      const { docId, image, name, bio, metricUnit, quantity, hsnCode } = body
      const validatorResponse = validator.validate(['docId', 'image', 'name', 'bio', 'metricUnit', 'quantity', 'hsnCode'], body)
      if (validatorResponse != null) throw validatorResponse
      if (!METRIC_UNITS.includes(metricUnit)) throw "Invalid Metric Unit"
      const updateQury = {
        ...body
      }
      const updateResponse = await SupplieProductModel.findOneAndUpdate({ _id: docId }, updateQury, { new: true });
      if (!updateResponse) throw "Invalid Product Id"
      return { status: STATUS_SUCCESS, message: "Products Added successfully", data: updateResponse }

    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async fetchSupplieProducts(body) {
    try {
      const { limit, currentPage, search } = body
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
      return {
        status: STATUS_SUCCESS, message: "Products Fetched Successfully", data: {
          pageCount: pageCount,
          products: reponse,
          metricUnits:METRIC_UNITS
        }
      }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async updateProductBlocking(body) {
    try {
      const { productId } = body
      const validatorResponse = validator.validate(['productId'], body)
      if (validatorResponse != null) throw validatorResponse
      const doc = await SupplieProductModel.findOne({ _id: productId }).lean();
      if (!doc) throw "Invalid Id"
      const blockState = doc.isBlocked ?? false
      const updatedDoc = await SupplieProductModel.findOneAndUpdate(
        { _id: productId },
        { isBlocked: !blockState },
        { upsert: true, new: true }
      );

      if (updatedDoc.modifiedCount == 0) throw "something went wrong to update"
      return { status: STATUS_SUCCESS, message: "Supplies Block Updated Successfully", data: updatedDoc }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

}

module.exports = ProductServices;