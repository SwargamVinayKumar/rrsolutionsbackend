const jwt = require('jsonwebtoken')
const adminSecretKey = process.env.ADMIN_SECRET_KEY
const dealerSecretKey = process.env.DEALER_SECRET_KEY
const userSecretKey = process.env.USER_SECRET_KEY
const { STATUS_FAILED, UNAUTHORIZED } = require('../config/api')

class MiddleWare {
    validateApiKey(req, res, next) {
        try {
            const {apikey} = req.headers
            if (apikey != process.env.API_KEY) return res.send({ status: STATUS_FAILED, message: 'Invalid APIKEY' })
            next()
        } catch (e) {
            return res.status(UNAUTHORIZED).send({ status: 0, message: 'Failed ' + e })
        }
    }

    validateAdmin(req, res, next) {
        try {
            const { apikey, authorization } = req.headers
            if (apikey != process.env.API_KEY) return res.send({ status: STATUS_FAILED, message: 'Invalid APIKEY' })
            const headToken = '' + authorization
            const realToken = headToken.replace('Bearer ', '')
            const mToken = jwt.verify(realToken, adminSecretKey)
            const expirationTime = mToken.exp * 1000
            const currentTime = Date.now()
            if (currentTime > expirationTime) {
                return res.status(UNAUTHORIZED).send({ status: 0, message: 'Token has expired' })
            }

            if(mToken?.email != process.env.ADMIN_MAIL || mToken?.password != process.env.ADMIN_PASSWORD){
                return res.status(UNAUTHORIZED).send({ status: 0, message: 'Token has expired' })
            }


            req.tokenDetails = {
                email: mToken?.email || '',
                password: mToken?.password || '',
            }
            next()
        } catch (e) {
            return res.status(UNAUTHORIZED).send({ status: 0, message: 'Failed ' + e })
        }
    }

    validateDealer(req, res, next) {
        try {
            const { apikey, authorization } = req.headers
            if (apikey != process.env.API_KEY) return res.send({ status: STATUS_FAILED, message: 'Invalid APIKEY' })
            const headToken = '' + authorization
            const realToken = headToken.replace('Bearer ', '')
            const mToken = jwt.verify(realToken, dealerSecretKey)
            const expirationTime = mToken.exp * 1000
            const currentTime = Date.now()
            if (currentTime > expirationTime) {
                return res.status(UNAUTHORIZED).send({ status: 0, message: 'Token has expired' })
            }
            req.tokenDetails = {
                mobile: mToken?.mobile || '',
                email: mToken?.email || '',
                id: mToken?.id || '',
            }
            next()
        } catch (e) {
            return res.status(UNAUTHORIZED).send({ status: 0, message: 'Failed ' + e })
        }
    }

    // validateToken(req, res, next) {
    //     try {
    //         const { apikey, authorization } = req.headers
    //         if (apikey != process.env.API_KEY) return res.send({ status: STATUS_FAILED, message: 'Invalid APIKEY' })
    //         const headToken = '' + authorization
    //         const realToken = headToken.replace('Bearer ', '')
    //         const mToken = jwt.verify(realToken, userSecretKey)
    //         const expirationTime = mToken.exp * 1000
    //         const currentTime = Date.now()
    //         if (currentTime > expirationTime) {
    //             return res.status(UNAUTHORIZED).send({ status: 0, message: 'Token has expired' })
    //         }
    //         req.tokenDetails = {
    //             id: mToken?.id || '',
    //             mobile: mToken?.mobile || '',
    //             email: mToken?.email || ''
    //         }
    //         next()
    //     } catch (e) {
    //         return res.status(UNAUTHORIZED).send({ status: 0, message: 'Failed ' + e })
    //     }
    // }

    validateUser(req, res, next) {
        try {
            const { apikey, authorization } = req.headers
            if (apikey != process.env.API_KEY) return res.send({ status: STATUS_FAILED, message: 'Invalid APIKEY' })
            if(authorization == "" || authorization == null){
                req.tokenDetails = null
                next()
                return;e
            }
            const headToken = '' + authorization
            const realToken = headToken.replace('Bearer ', '')
            const mToken = jwt.verify(realToken, userSecretKey)
            const expirationTime = mToken.exp * 1000
            const currentTime = Date.now()
            if (currentTime > expirationTime) {
                return res.status(UNAUTHORIZED).send({ status: 0, message: 'Token has expired' })
            }
            req.tokenDetails = {
                id: mToken?.id || '',
                mobile: mToken?.mobile || '',
                email: mToken?.email || ''
            }
            next()
        } catch (e) {
            return res.status(UNAUTHORIZED).send({ status: 0, message: 'Failed ' + e })
        }
    }
}
module.exports = MiddleWare