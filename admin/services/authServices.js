const { STATUS_SUCCESS, STATUS_FAILED, MEDIA_TYPE, MEMBERSHIP_TYPES, SUBSCRIPTION_DURATIONS } = require('../../config/api')
const jwtToken = require('jsonwebtoken')
const Validator = require('../../extensions/Validator')
const validator = new Validator();
const secretKey = process.env.ADMIN_SECRET_KEY;
const dealerSecretKey = process.env.DEALER_SECRET_KEY;
const mongoose = require('mongoose')
const moment = require("moment")
const { getStorage, getDownloadURL } = require('firebase-admin/storage');

const bucket = getStorage().bucket('gs://ram-raheem-solutions.firebasestorage.app')

const ExtraModel = require('../../models/ExtraModel');
const NotificationService = require('../../extensions/Notification');
const DealerModel = require('../../models/DealerModel');
const OrdersModel = require('../../models/OrdersModel');

const ProductModel = require('../../models/ProductModel');
const SubscriptionModel = require('../../models/SubscriptionModel');
const LeadModel = require('../../models/LeadModel');
const notificationService = new NotificationService();


class AuthServices {

  async lead(body){
    try{
      const savedResponse = new LeadModel({...body});
      await savedResponse.save();
      return { status: STATUS_SUCCESS, message: "Lead Saved Successfully" }
    }
    catch(err){
        return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async fetchStats(body, tokenDetails) {
    try {
      const { id } = tokenDetails;
      const { startDate, endDate } = body;


      let query = {};

      if ((startDate && endDate)) {
        const dateQuery = {};

        if (startDate) {
          const startOfDay = moment.utc(startDate).startOf("day").toDate();
          dateQuery.$gte = startOfDay;
        }

        if (endDate) {
          const endOfDay = moment.utc(endDate).endOf("day").toDate();
          dateQuery.$lte = endOfDay;
        }

        if (Object.keys(dateQuery).length > 0) {
          query.createdAt = dateQuery;
        }
      }

      // Get inventory count
      const totalProducts = await ProductModel.countDocuments();
      const totalDealers = await DealerModel.countDocuments();
      const onPendingDealers = await DealerModel.countDocuments({ approvalStatus: "pending" });
      const onRejectedDealers = await DealerModel.countDocuments({ approvalStatus: "rejected" });
      const onApprovedDealers = await DealerModel.countDocuments({ approvalStatus: "approved" });

      // Get all order counts with the query
      const allOrders = await OrdersModel.countDocuments({ ...query });
      const onRequestOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "onrequest" });
      const onGoingOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "ongoing" });
      const completedOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "completed" });
      const rejectedOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "rejected" });

      const retailOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "completed", calculatedAs: "retail" });
      const wholesaleOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "completed", calculatedAs: "wholesale" });

      const subscrptions = await SubscriptionModel.countDocuments({ ...query, paymentStatus: "success" });
      console.log(query)
      // Aggregation for completed orders with sorting
      const completedOrdersAggregation = await OrdersModel.aggregate([
        {
          $match: {
            orderStatus: "completed",
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate && { $gte: moment.utc(startDate).startOf("day").toDate() }),
                ...(endDate && { $lte: moment.utc(endDate).endOf("day").toDate() })
              }
            } : {})
          }
        },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalFare: { $sum: "$calculatedFare" }
          }
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
            totalFare: 1
          }
        }
      ]);

      const completedSubscriptionAggregation = await SubscriptionModel.aggregate([
        {
          $match: {
            paymentStatus: "success",
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate && { $gte: moment.utc(startDate).startOf("day").toDate() }),
                ...(endDate && { $lte: moment.utc(endDate).endOf("day").toDate() })
              }
            } : {})
          }
        },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalFare: { $sum: "$price" }
          }
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
            totalFare: 1
          }
        }
      ]);


      const result = completedOrdersAggregation[0] || { totalCount: 0, totalFare: 0 };
      const totalCalculatedFare = result.totalFare;


      const subscritionResult = completedSubscriptionAggregation[0] || { totalCount: 0, totalFare: 0 };
      const totalSubscriptionRevenue = subscritionResult.totalFare;

      // Create statsMap object (key-value pair) instead of array to match frontend expectations
      const statsMap = {
        "Total Products": totalProducts,
        "Total Dealers": totalDealers,
        "On Pending Dealers": onPendingDealers,
        "Rejected Dealers": onRejectedDealers,
        "Approved Dealers": onApprovedDealers,
        "Total Orders": allOrders,
        "Requested Orders": onRequestOrders,
        "Ongoing Orders": onGoingOrders,
        "Completed Orders": completedOrders,
        "Rejected Orders": rejectedOrders,
        "Retail Orders": retailOrders,
        "Wholesale Orders": wholesaleOrders,
        "Total Calculated Fare from Completed Orders": totalCalculatedFare,
        "SubScriptions": subscrptions,
        "Subscription Revenue": totalSubscriptionRevenue
      };

      console.log(statsMap)


      return {
        status: STATUS_SUCCESS,
        message: "Stats Fetched Successfully",
        data: statsMap,
        lastUpdated: new Date().toISOString() // Add timestamp for last update
      };
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" };
    }
  }

  async login(body) {
    try {
      const { email, password } = body;
      const validatorResponse = validator.validate(['email', 'password'], body)
      if (validatorResponse != null) throw validatorResponse

      if (email == process.env.ADMIN_MAIL && password == process.env.ADMIN_PASSWORD) {
        const adminToken = await jwtToken.sign({ email: process.env.ADMIN_MAIL, password: process.env.ADMIN_PASSWORD }, secretKey, {
          expiresIn: '90 days',
          algorithm: 'HS256'
        });

        return {
          status: STATUS_SUCCESS, message: "Verified Successfully", data: {
            token: adminToken,
            userType: "admin",
            userId: "admin",
            name: "RRSolutions",
            email: "rrsolutions@email.com"
          }
        }
      }

      const dealerData = await DealerModel.findOne({ email, password }).lean();

      if (!dealerData) throw "Invalid Credentials"
      const authToken = await jwtToken.sign({ id: dealerData._id }, dealerSecretKey, {
        expiresIn: '90 days',
        algorithm: 'HS256'
      });

      return {
        status: STATUS_SUCCESS,
        message: "Verified Successfully",
        data: {
          token: authToken,
          userType: "dealer",
          userId: dealerData._id,
          name: dealerData.name,
          email: dealerData.email
        }
      }

    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }

  async uploadFile(req) {
    try {
      const file = req.files.file
      const { type } = req.body
      if (!file) {
        return { status: STATUS_FAILED, message: 'Please upload image' }
      }


      console.log("TYPE",)

      if (!MEDIA_TYPE.includes(type)) throw 'Invalid Type'
      const path = require('path')

      const fileExtension = path.extname(file.name)
      const fileNameInStorage = `${type}/${Date.now()}${fileExtension}`
      const blob = bucket.file(fileNameInStorage)

      await blob.save(file.data, {
        metadata: {
          contentType: file.mimetype,
          contentDisposition: 'inline'
        }
      })
      const mediaUrl = await getDownloadURL(blob)


      return { status: STATUS_SUCCESS, message: 'File Uploaded Successfully', data: mediaUrl }
    } catch (error) {
      return { status: STATUS_FAILED, message: '' + error }
    }
  }


  async updateBanners(body) {
    try {
      const { banners } = body
      const validatorResponse = validator.validate(['banners'], body)
      if (validatorResponse != null) throw validatorResponse
      const response = await ExtraModel.findOneAndUpdate({ name: "banner" }, { list: banners }, { new: true, upsert: true })
      return {
        status: STATUS_SUCCESS,
        message: 'Banners Updated Successfully',
        data: response
      }
    }
    catch (error) {
      return { status: STATUS_FAILED, message: '' + error }
    }
  }


  async fetchBanners(body) {
    try {
      const response = await ExtraModel.findOne({ name: "banner" }).lean()
      return {
        status: STATUS_SUCCESS,
        message: 'Banners Updated Successfully',
        data: response.list || []
      }
    }
    catch (error) {
      return { status: STATUS_FAILED, message: '' + error }
    }
  }


  async fetchSubscriptions(body) {
    try {
      const { limit, currentPage } = body
      const validatorResponse = validator.validate(['limit', 'currentPage'], body)
      if (validatorResponse != null) throw validatorResponse

      const docCount = await SubscriptionModel.countDocuments();
      const skip = (currentPage - 1) * limit;
      let pageCount;
      if (docCount % limit === 0) {
        pageCount = docCount / limit;
      } else {
        pageCount = Math.floor(docCount / limit) + 1;
      }

      const reponse = await SubscriptionModel.find().populate("subscribedBy", "busbusinessNameinesName businessLogo").skip(skip).limit(limit).sort({ createdAt: -1 }).lean()
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



  async fetchSubscriptionData(body) {
    try {
      const subscriptions = await ExtraModel.findOne({ name: "subscriptions" }).lean();
      const finalResponse = {
        ...subscriptions,
        membershipTypes: MEMBERSHIP_TYPES,
        subscriptionDurations: SUBSCRIPTION_DURATIONS
      }
      return { status: STATUS_SUCCESS, message: 'Successfully Fetched', data: finalResponse || {} }
    }
    catch (error) {
      return { status: STATUS_FAILED, message: '' + error }
    }
  }

  async updateSubscriptionData(body) {
    try {
      const { docId, name, membershipType, duration, price, discount, durationByDays, isActive, list } = body;

      const validatorResponse = validator.validate(
        ['docId', 'name', 'membershipType', 'duration', 'price', 'discount', 'durationByDays', 'isActive', 'list'],
        body
      );
      if (validatorResponse) throw validatorResponse;

      if (!MEMBERSHIP_TYPES.includes(membershipType)) throw "Invalid Membership Type";
      if (!SUBSCRIPTION_DURATIONS.includes(duration)) throw "Invalid subscription duration";

      const updateResponse = await ExtraModel.updateOne(
        { name: "subscriptions" },
        {
          $set: {
            "subscriptions.$[sub].name": name,
            "subscriptions.$[sub].membershipType": membershipType,
            "subscriptions.$[sub].duration": duration,
            "subscriptions.$[sub].price": price,
            "subscriptions.$[sub].discount": discount,
            "subscriptions.$[sub].isActive": isActive,
            "subscriptions.$[sub].updatedAt": new Date(),
            "subscriptions.$[sub].list": list,
          }
        },
        {
          arrayFilters: [
            { "sub._id": docId }
          ]
        }
      );

      if (updateResponse.modifiedCount === 0) {
        throw "No subscription updated. Invalid subscriptionId";
      }


      const subscriptions = await ExtraModel.findOne({ name: "subscriptions" }).lean();

      const finalResponse = {
        ...subscriptions,
        membershipTypes: MEMBERSHIP_TYPES,
        subscriptionDurations: SUBSCRIPTION_DURATIONS
      }

      return {
        status: STATUS_SUCCESS,
        message: "Subscription updated successfully",
        data: finalResponse
      };
    } catch (error) {
      return {
        status: STATUS_FAILED,
        message: String(error)
      };
    }
  }

  async addSubscription(body) {
    try {
      // Validation
      const validatorResponse = validator.validate(['name', 'membershipType', 'duration', 'price', 'discount', 'durationByDays', 'list'], body);
      if (validatorResponse) throw validatorResponse;

      if (!MEMBERSHIP_TYPES.includes(body.membershipType)) throw "Invalid Membership Type";
      if (!SUBSCRIPTION_DURATIONS.includes(body.duration)) throw "Invalid subscription duration";


      const newSubscription = {
        ...body,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updateResponse = await ExtraModel.updateOne(
        { name: "subscriptions" },
        {
          $push: {
            subscriptions: newSubscription
          }
        }
      );

      if (updateResponse.modifiedCount === 0) {
        throw "Failed to add subscription";
      }

      const data = await ExtraModel.findOne({ name: "subscriptions" }).lean();

      const finalResponse = {
        ...data,
        membershipTypes: MEMBERSHIP_TYPES,
        subscriptionDurations: SUBSCRIPTION_DURATIONS
      }

      return {
        status: STATUS_SUCCESS,
        message: "Subscription added successfully",
        data: finalResponse
      };
    } catch (error) {
      return {
        status: STATUS_FAILED,
        message: String(error)
      };
    }
  }

  async deleteSubscription(body) {
    try {
      const { docId } = body;
      const validatorResponse = validator.validate(['docId'], body);
      if (validatorResponse) throw validatorResponse;
      const updateResponse = await ExtraModel.updateOne(
        { name: "subscriptions" },
        {
          $pull: {
            subscriptions: { _id: docId }
          }
        }
      );
      if (updateResponse.modifiedCount === 0) throw "Failed to delete subscription. Invalid subscriptionId";
      const data = await ExtraModel.findOne({ name: "subscriptions" }).lean();
      const finalResponse = {
        ...data,
        membershipTypes: MEMBERSHIP_TYPES,
        subscriptionDurations: SUBSCRIPTION_DURATIONS
      };

      return {
        status: STATUS_SUCCESS,
        message: "Subscription deleted successfully",
        data: finalResponse
      };
    } catch (error) {
      return {
        status: STATUS_FAILED,
        message: String(error)
      };
    }
  }



}

module.exports = AuthServices;