const { fetch } = require('undici')
const Validator = require('./Validator');
const validator = new Validator();

const liveToken = 'Basic cnpwX2xpdmVfWGhqd2VEQlNmOWZMdU46cmRmdmZqQVlpcjkyVkg2ODBWTHdBV1BZ'
const testToken = 'Basic cnpwX3Rlc3RfU05ZeVE2OUpXdVc3STc6ajA0aXlKNE9rT05GbHNYUXV4STdNWWcy'

const baseUrl = 'https://api.razorpay.com/v1'
const axios = require('axios');

const headers = {
    'Content-Type': 'application/json',
    Authorization: testToken
}

class RazorPayServices {

    createToken = async (keyId, keySecret) => {
        const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        console.log(token)
        return token;
    }

    checkOrderID = async (orderID) => {
        const response = await fetch(baseUrl + '/orders/' + orderID, {
            method: 'GET',
            headers: headers
        })
        return await response.json()
    }

    createOrder = async (amount) => {
        const response = await fetch(baseUrl + '/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                amount: amount + '00',
                currency: 'INR'
            })
        })

        const data = await response.json()
        return data
    }


    refundPayment = async (paymentId, amount = null) => {
        try {

            const body = {};

            if (amount) {
                body.amount = amount * 100;
            }

            const response = await axios.post(
                `https://api.razorpay.com/v1/payments/${paymentId}/refund`,
                body,
                {
                    auth: {
                        username: process.env.KEY_ID,
                        password: process.env.KEY_SECRET
                    },
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error("Refund Error:", error.response?.data || error.message);
            throw error;
        }

    };

}

module.exports = RazorPayServices