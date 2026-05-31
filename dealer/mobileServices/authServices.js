const { STATUS_SUCCESS, STATUS_FAILED, MEDIA_TYPE } = require('../../config/api')
const jwtToken = require('jsonwebtoken')
const Validator = require('../../extensions/Validator')
const validator = new Validator();
const secretKey = process.env.DEALER_SECRET_KEY;

const { getStorage, getDownloadURL } = require('firebase-admin/storage');

const bucket = getStorage().bucket('gs://ram-raheem-solutions.firebasestorage.app')


const ExtraModel = require('../../models/ExtraModel');
const DealerModel = require('../../models/DealerModel');



class AuthServices {

  async getProfile(body) {
    try {
      const { dealerId } = body;

      const validatorResponse = validator.validate(['dealerId'], body);
      if (validatorResponse != null) throw validatorResponse;

      const response = await DealerModel.findOne({ _id: dealerId }).lean();
      if (!response) throw "Dealer Not Found";

      const subscriptionConfig = await ExtraModel.findOne({ name: "subscriptions" }).lean();

      const hasSubscription = !!response.subscription;

      let isActive = false;

      if (hasSubscription && response.subscription.endDate) {
        const endDate = new Date(response.subscription.endDate);
        isActive = endDate > new Date();
      }

      // ✅ Safe default for freeTrial
      const isFreeTrialEnabled = subscriptionConfig?.freeTrial === true;

      // ✅ Final logic
      const subscriptionRequired = !(hasSubscription && isActive && !isFreeTrialEnabled);

      return {
        status: STATUS_SUCCESS,
        message: "Details Fetched Successfully",
        subscriptionRequired: false, // always present
        approvalStatus: response.approvalStatus,
        data: response.approvalStatus === "approved" ? response : null
      };

    } catch (err) {
      return { status: STATUS_FAILED, message: err + "" };
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

}

module.exports = AuthServices;