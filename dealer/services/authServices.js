const { STATUS_SUCCESS, STATUS_FAILED, MEDIA_TYPE, FREE_TRIAL_DAYS } = require('../../config/api')
const jwtToken = require('jsonwebtoken')
const Validator = require('../../extensions/Validator')
const validator = new Validator();
const secretKey = process.env.DEALER_SECRET_KEY;
const crypto = require("crypto");

const { getStorage, getDownloadURL } = require('firebase-admin/storage');

const bucket = getStorage().bucket('gs://ram-raheem-solutions.firebasestorage.app')
const axios = require("axios");


const ExtraModel = require('../../models/ExtraModel');
const DealerModel = require('../../models/DealerModel');
const SubscriptionModel = require('../../models/SubscriptionModel')
const mongoose = require('mongoose');

const RazorPayServices = require('../../extensions/razorPayService');
const DealerInventoryModel = require('../../models/DealerInventoryModel');
const OrdersModel = require('../../models/OrdersModel');
const razorPayServices = new RazorPayServices();
const moment = require("moment")



class AuthServices {

  async signIn(body) {
    try {
      const { email, password } = body;
      const validatorResponse = validator.validate(['email', 'password'], body)
      if (validatorResponse != null) throw validatorResponse

      const dealerExist = await DealerModel.findOne({ email: email }).select("email approvalStatus").lean();
      if (!dealerExist) throw "Invalid Credentials"
      if (dealerExist?.password != password) throw "Invalid Password";

      const authToken = await jwtToken.sign({ email: dealerExist?.email, password: dealerExist?.password, id: dealerExist?._id }, secretKey, {
        expiresIn: '90 days',
        algorithm: 'HS256'
      });

      return {
        status: STATUS_SUCCESS, message: "Deatails Fetched Successfully", data: {
          token: authToken,
          approvalStatus: dealerExist?.approvalStatus,
          details: dealerExist?.approvalStatus == "approved" ? dealerExist : null
        }
      }
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }


  async signUp(body) {
    try {
      const { mobile, name, email, password, confirmPassword, businessName, aboutBusiness, gstIn } = body;
      const validatorResponse = validator.validate(['mobile', 'name', 'email', 'password', 'confirmPassword', 'businessName', 'aboutBusiness'], body)
      if (validatorResponse != null) throw validatorResponse

      if (password != confirmPassword) throw "Password And Confirm Password Should Same";

      const dealerExist = await DealerModel.findOne({ email: email }).select("email approvalStatus").lean();
      if (dealerExist || email == process.env.ADMIN_MAIL) throw "Please Sign In.An Login Exist By This Mail. Or Try With An Other Mail"

      // Auto-approve the dealer and start a free trial immediately on sign-up — no manual steps.
      const trialStartedAt = new Date();
      const trialEndsAt = new Date(trialStartedAt.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);

      const dealerModel = new DealerModel({
        ...body,
        approvalStatus: "approved",
        trialStartedAt,
        trialEndsAt
      });

      const savedResponse = await dealerModel.save()


      const authToken = await jwtToken.sign({ email: savedResponse?.email, password: savedResponse?.password, id: savedResponse?._id }, secretKey, {
        expiresIn: '90 days',
        algorithm: 'HS256'
      });

      return {
        status: STATUS_SUCCESS, message: "Sighned Successfully", data: {
          token: authToken,
          approvalStatus: "approved",
          onFreeTrial: true,
          daysLeft: FREE_TRIAL_DAYS
        }
      }

    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" }
    }
  }


  async getProfile(body, tokenDetails) {
    try {
      const { id } = tokenDetails;

      const validatorResponse = validator.validate(['id'], tokenDetails);
      if (validatorResponse != null) throw validatorResponse;

      const response = await DealerModel.findOne({ _id: id })
        .populate('subscription')
        .lean();

      if (!response) throw "Dealer not found";

      const subscriptionConfig = await ExtraModel.findOne({ name: "subscriptions" }).lean();

      const now = new Date();

      // 1) Active paid subscription?
      const hasSubscription = Boolean(response?.subscription);
      let subscriptionActive = false;
      let subscriptionDaysLeft = 0;

      if (hasSubscription) {
        const endDate = new Date(response.subscription.endDate);
        subscriptionActive = endDate > now;
        if (subscriptionActive) {
          subscriptionDaysLeft = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      }

      // 2) Free trial still running?
      let trialActive = false;
      let trialDaysLeft = 0;

      if (response?.trialEndsAt) {
        const trialEnd = new Date(response.trialEndsAt);
        trialActive = trialEnd > now;
        if (trialActive) {
          trialDaysLeft = Math.ceil(
            (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      }

      // ✅ FINAL LOGIC
      // The dealer can use the app while either a paid subscription is active,
      // the free trial is still running, or the admin has enabled a global free trial.
      const globalFreeTrial = subscriptionConfig?.freeTrial === true;
      const onFreeTrial = trialActive && !subscriptionActive;

      let subscriptionRequired = true;
      if (globalFreeTrial || subscriptionActive || trialActive) {
        subscriptionRequired = false;
      }

      // Days left shown in the UI: prefer the paid subscription, otherwise the trial.
      const daysLeft = subscriptionActive ? subscriptionDaysLeft : trialDaysLeft;

      return {
        status: STATUS_SUCCESS,
        message: "Details Fetched Successfully",
        subscriptionRequired,
        approvalStatus: response.approvalStatus,
        onFreeTrial,
        daysLeft,
        data: response.approvalStatus === "approved"
          ? { ...response, daysLeft, onFreeTrial }
          : null
      };

    } catch (err) {
      return { status: STATUS_FAILED, message: err + "" };
    }
  }

  async fetchSubscriptions(body, tokenDetails) {
    try {
      const { id } = tokenDetails;
      if (!id) throw "Invalid Token";

      const response = await DealerModel.findOne({ _id: id })
        .populate("subscription")
        .lean();

      if (!response) throw "No user Founded By Auth";

      const subscriptionModel = await ExtraModel.findOne({ name: "subscriptions" }).lean();
      if (!subscriptionModel) throw "No Subscription Data Found";

      if (subscriptionModel.freeTrial == true) {
        return {
          status: STATUS_SUCCESS,
          message: "Fetch Subscriptions Successfully",
          data: {
            subscribed: true,
            list: [],
            subscriptions: []
          }
        };
      }

      const activeSubscriptions = subscriptionModel?.subscriptions?.filter(
        sub => sub?.isActive === true
      );


      if (response?.subscription == null) {
        return {
          status: STATUS_SUCCESS,
          message: "Fetch Subscriptions Successfully",
          data: {
            subscribed: false,
            list: subscriptionModel?.list || [],
            subscriptions: activeSubscriptions || []
          }
        };
      }

      const hasSubscription = Boolean(response?.subscription);

      let isActive = false;

      if (hasSubscription) {
        const endDate = new Date(response?.subscription?.endDate);
        isActive = endDate > new Date();
      }

      if (isActive === true) {
        return {
          status: STATUS_SUCCESS,
          message: "Fetch Subscriptions Successfully",
          data: {
            subscribed: true,
            list: [],
            subscriptions: []
          }
        };
      }


      return {
        status: STATUS_SUCCESS,
        message: "Fetch Subscriptions Successfully",
        data: {
          subscribed: isActive,
          list: subscriptionModel?.list || [],
          subscriptions: activeSubscriptions || []
        }
      };

    } catch (err) {
      return { status: STATUS_FAILED, message: err + "" };
    }
  }

  async performSubscription(body, tokenDetails) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { subscriptionId } = body;
      const { id } = tokenDetails;

      if (!subscriptionId) throw "subscriptionId is required";

      const subscriptionData = await ExtraModel.findOne({ name: "subscriptions" }).lean();
      if (!subscriptionData) throw "Subscription config not found";

      const plan = subscriptionData.subscriptions.find(
        (s) => s._id.toString() === subscriptionId
      );

      if (!plan) throw "Invalid subscription plan";

      const amount = plan.price - plan.discount;

      // 🔹 Create Razorpay order
      const order = await razorPayServices.createOrder(amount);
      if (!order?.id) throw "Order creation failed";

      // 🔹 Create dummy subscription (PENDING)
      const pendingSubscription = await SubscriptionModel.create(
        [{
          name: plan.name,
          membershipType: plan.membershipType,
          duration: plan.duration,
          durationByDays: plan.durationByDays,
          price: plan.price,
          discount: plan.discount,
          subscribedBy: id,
          orderId: order.id,
          paymentStatus: "pending",
        }],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        status: 1,
        message: "Order created",
        data: {
          orderId: order.id,
          amount: order.amount,
          subscriptionDocId: pendingSubscription[0]._id, // useful if needed
        },
      };

    } catch (err) {
      await session.abortTransaction();
      session.endSession();

      return {
        status: 0,
        message: String(err),
      };
    }
  }


  async updateSubscriptionStatus(body, tokenDetails) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderId, paymentId, signature } = body;
      const { id } = tokenDetails;

      if (!orderId || !paymentId || !signature) {
        throw "Missing payment details";
      }

      // 🔐 VERIFY SIGNATURE
      const generatedSignature = crypto
        .createHmac("sha256", process.env.KEY_SECRET)
        .update(orderId + "|" + paymentId)
        .digest("hex");

      if (generatedSignature !== signature) {
        throw "Invalid payment signature";
      }

      // 🔎 FIND PENDING SUBSCRIPTION
      const subscription = await SubscriptionModel.findOne({
        orderId,
        subscribedBy: id,
        paymentStatus: "pending",
      }).session(session);

      if (!subscription) {
        throw "Subscription not found or already processed";
      }

      // 🧠 CHECK EXISTING ACTIVE SUBSCRIPTION
      const dealer = await DealerModel.findById(id).populate("subscription");

      if (dealer?.subscription) {
        const isActive = new Date(dealer.subscription.endDate) > new Date();
        if (isActive) throw "Already subscribed";
      }

      // 🔄 UPDATE SUBSCRIPTION
      subscription.paymentStatus = "success";
      subscription.startDate = new Date();
      subscription.endDate = new Date(
        Date.now() + subscription.durationByDays * 24 * 60 * 60 * 1000
      );

      await subscription.save({ session });

      // 🔗 LINK TO DEALER
      await DealerModel.findByIdAndUpdate(
        id,
        { subscription: subscription._id },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        status: 1,
        message: "Subscription activated successfully",
      };

    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      session.endSession();

      return {
        status: 0,
        message: String(err),
      };
    }
  }


  async uploadFile(req) {
    try {
      const file = req.files.file
      if (!file) {
        return { status: STATUS_FAILED, message: 'Please upload image' }
      }
      const { type } = req.body
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

  async fetchStats(body, tokenDetails) {
    try {
      const { id } = tokenDetails;
      const dealerId = id;
      const { startDate, endDate, timeframe } = body;

      if (!mongoose.Types.ObjectId.isValid(dealerId)) throw "Invalid Dealer Id"

      let query = { dealerId: dealerId };

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

      console.log(query)

      // Get inventory count
      const inventoryCount = await DealerInventoryModel.countDocuments({ dealerId: dealerId });

      // Get all order counts with the query
      const totalOrders = await OrdersModel.countDocuments(query);
      const onRequestOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "onrequest" });
      const onGoingOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "ongoing" });
      const completedOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "completed" });
      const rejectedOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "rejected" });

      const retailOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "completed", calculatedAs: "retail" });
      const wholesaleOrders = await OrdersModel.countDocuments({ ...query, orderStatus: "completed", calculatedAs: "wholesale" });

      console.log(query)
      // Aggregation for completed orders with sorting
      const completedOrdersAggregation = await OrdersModel.aggregate([
        {
          $match: {
            orderStatus: "completed",
            dealerId: new mongoose.Types.ObjectId(dealerId),
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

      console.log(completedOrdersAggregation)

      const result = completedOrdersAggregation[0] || { totalCount: 0, totalFare: 0 };
      const totalCalculatedFare = result.totalFare;

      // Create statsMap object (key-value pair) instead of array to match frontend expectations
      const statsMap = {
        "Inventory Count": inventoryCount,
        "Total Order": totalOrders,
        "Requested Order": onRequestOrders,
        "Ongoing Orders": onGoingOrders,
        "Rejected Orders": rejectedOrders, // Keeping the typo to match frontend
        "Completed Orders": completedOrders,
        "Retail Orders": retailOrders,
        "Wholesale Orders": wholesaleOrders,
        "Sale": totalCalculatedFare
      };

      console.log("Stats Map:", statsMap);

      // Optional: Get sorted orders list if needed
      const sortedOrders = await OrdersModel.find(query)
        .sort({ createdAt: -1 })
        .limit(100);

      return {
        status: STATUS_SUCCESS,
        message: "Stats Fetched Successfully",
        data: statsMap, // Now returning as object instead of array
        sortedOrders: sortedOrders,
        lastUpdated: new Date().toISOString() // Add timestamp for last update
      };
    }
    catch (err) {
      return { status: STATUS_FAILED, message: err + "" };
    }
  }

  sortObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(this.sortObject);
    }

    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce((result, key) => {
          result[key] = this.sortObject(obj[key]);
          return result;
        }, {});
    }

    return obj;
  }


  buildConcatString(obj) {
    let result = "";

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (
        typeof value === "object" &&
        value !== null
      ) {
        result += JSON.stringify(value);
      } else {
        result += value;
      }
    });

    return result;
  }

  generateSecureHash(requestPayload, secretKey) {

    // Clone payload
    let data = JSON.parse(JSON.stringify(requestPayload));

    // Remove existing secureHash if present
    if (data.secureHash) {
      delete data.secureHash;
    }

    // Sort request
    const sortedData = this.sortObject(data);

    // Build concatenated string
    const dataToHash = this.buildConcatString(sortedData);

    // Generate HMAC SHA256
    const secureHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataToHash)
      .digest("hex");

    // Add hash to request
    sortedData.secureHash = secureHash;

    return {
      sortedData,
      concatenatedString: dataToHash,
      secureHash,
      finalRequest: sortedData
    };
  }


  async invoiceVerifyRequest(requestPayload) {
    try {
      console.log("REQUEST")
      console.log(JSON.stringify(requestPayload, null, 2))
      const response = await axios({
        method: "POST",
        url: "https://pgpayuat.icicibank.com/tsp/pg/portal/pay/paymentInvoiceService",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: requestPayload,
        timeout: 30000,
      });

      console.log(response)

      if (response.data?.responseCode !== "0000") {
        return {
          success: false,
          statusCode: response.status,
          message:
            response.data?.responseDescription || "Payment verification failed",
          response: response.data,
        };
      }

      return {
        success: true,
        statusCode: response.status,
        response: response.data,
      };
    } catch (error) {
      console.log("gjhkj")
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.responseDescription ||
          error.message ||
          "Internal Server Error",
        error: error.response?.data || error,
      };
    }
  }

  async invoiceTestUdfFields(body) {
    try {

      const { fieldRequests } = body;

      console.log(fieldRequests);

      // Validate main body
      const validatorResponse =
        validator.validate(
          ['fieldRequests'],
          body
        );

      if (validatorResponse != null) {
        throw validatorResponse;
      }

      // Final response list
      const responseList = [];
      const passedFieldIndex = [];
      const failedFieldIndex = [];

      // Loop requests
      for (const [index, fieldRequest] of fieldRequests.entries()) {

        try {

          // Validate each request
          const fieldValidatorResponse =
            validator.validate(
              ['scenario', 'request'],
              fieldRequest
            );

          if (fieldValidatorResponse != null) {
            throw fieldValidatorResponse;
          }

          // Generate hash
          const validRequest =
            this.generateSecureHash(
              fieldRequest.request,
              "db06cca0-838b-4e01-8b20-6ac446ffb6bd"
            );

          console.log(
            `Processing ${fieldRequest.scenario}`
          );

          // API call
          const validResponse = await this.invoiceVerifyRequest(
            validRequest.finalRequest
          );

          console.log(validResponse);

          if (validResponse.success) {
            passedFieldIndex.push(index);
          }
          else {
            failedFieldIndex.push(index);
          }

          // Push response
          responseList.push({
            index,
            scenario: fieldRequest.scenario,
            request: validRequest.finalRequest,
            response: validResponse,
            status: validResponse.success ? "passed" : "failed",
            failedReason: validResponse.success ? null : validResponse.message
          });

        }
        catch (err) {

          // Push failed response
          responseList.push({
            index,
            scenario: fieldRequest?.scenario || "",
            error: err.message || String(err)
          });
        }
      }

      return {
        status: STATUS_SUCCESS,
        message: 'UDF Testing Completed',
        data: responseList,
        passedFieldIndex,
        failedFieldIndex
      };

    }
    catch (error) {
      console.log("gjhkkjjiloj")
      return {
        status: STATUS_FAILED,
        message: error.message || String(error)
      };
    }
  }


  async verifyRequest(requestPayload) {
    try {
      const response = await axios({
        method: "POST",
        url: "https://pgpayuat.icicibank.com/tsp/pg/api/v2/initiateSale",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: requestPayload,
        timeout: 30000,
      });

      if (response.data?.responseCode !== "R1000") {
        return {
          success: false,
          statusCode: response.status,
          message:
            response.data?.responseDescription || "Payment verification failed",
          response: response.data,
        };
      }

      return {
        success: true,
        statusCode: response.status,
        response: response.data,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.responseDescription ||
          error.message ||
          "Internal Server Error",
        error: error.response?.data || error,
      };
    }
  }

  async testUdfFields(body) {
    try {

      const { fieldRequests } = body;

      // Validate main body
      const validatorResponse =
        validator.validate(
          ['fieldRequests'],
          body
        );

      if (validatorResponse != null) {
        throw validatorResponse;
      }

      // Final response list
      const responseList = [];
      const passedFieldIndex = [];
      const failedFieldIndex = [];

      // Loop requests
      for (const [index, fieldRequest] of fieldRequests.entries()) {

        try {

          // Validate each request
          const fieldValidatorResponse =
            validator.validate(
              ['scenario', 'request'],
              fieldRequest
            );

          if (fieldValidatorResponse != null) {
            throw fieldValidatorResponse;
          }

          // Generate hash
          const validRequest =
            this.generateSecureHash(
              fieldRequest.request,
              "db06cca0-838b-4e01-8b20-6ac446ffb6bd"
            );

          console.log(
            `Processing ${fieldRequest.scenario}`
          );

          // API call
          const validResponse = await this.verifyRequest(
            validRequest.finalRequest
          );

          console.log(validResponse);

          if (validResponse.success) {
            passedFieldIndex.push(index);
          }
          else {
            failedFieldIndex.push(index);
          }

          // Push response
          responseList.push({
            index,
            scenario: fieldRequest.scenario,
            request: validRequest.finalRequest,
            response: validResponse,
            status: validResponse.success ? "passed" : "failed",
            failedReason: validResponse.success ? null : validResponse.message
          });

        }
        catch (err) {

          // Push failed response
          responseList.push({
            index,
            scenario: fieldRequest?.scenario || "",
            error: err.message || String(err)
          });
        }
      }

      return {
        status: STATUS_SUCCESS,
        message: 'UDF Testing Completed',
        data: responseList,
        passedFieldIndex,
        failedFieldIndex
      };

    }
    catch (error) {

      return {
        status: STATUS_FAILED,
        message: error.message || String(error)
      };
    }
  }

}

module.exports = AuthServices;