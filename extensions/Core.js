// const { fetch } = require('undici')

const mongoose = require('mongoose');
const moment = require('moment');

class Core {


    fetchBussinessStats = async (dealerId,startDate = null, endDate = null) => {
        try {
            let matchQuery = {};
            let dateQuery = {};

            if (startDate != null && endDate != null) {
                const startOfDay = moment.tz(startDate, "Asia/Kolkata")
                    .startOf("day")
                    .utc()
                    .toDate();

                const endOfDay = moment.tz(endDate, "Asia/Kolkata")
                    .add(1, "day")
                    .startOf("day")
                    .utc()
                    .toDate();

                matchQuery.createdAt = {
                    $gte: startOfDay,
                    $lte: endOfDay,
                };
            }

            // ✅ Round everything to 2 decimals
            return {
               
            };
        } catch (error) {
            return {
                
            };
        }
    };


   

}

module.exports = Core
