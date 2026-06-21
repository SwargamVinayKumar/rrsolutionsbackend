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


  async fetchSingleProductByHSN(body) {
    try {
      const { dealerId, hsnCode } = body;

      // ✅ Validation
      const validatorResponse = validator.validate(['dealerId', 'hsnCode'], body);
      if (validatorResponse != null) throw validatorResponse;

      const pipeline = [
        {
          $match: {
            dealerId: new mongoose.Types.ObjectId(dealerId)
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


  async fetchOrders(body, tokenDetails) {
    try {
      const { id } = tokenDetails;
      const { search, orderStatus, limit, currentPage, startDate, endDate } = body
      const validatorResponse = validator.validate(['orderStatus', 'limit', 'currentPage'], body)
      if (validatorResponse != null) throw validatorResponse
      const escapedSearch = validator.escapeRegex(search);

      // Base query with dealerId
      let baseQuery = { dealerId: id };

      // Add orderStatus filter if not "all"
      if (orderStatus !== "all") {
        baseQuery.orderStatus = orderStatus;
      }

      // Add date range filter if both startDate and endDate are provided
      if (startDate && endDate) {
        baseQuery.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      // If only startDate is provided
      else if (startDate && !endDate) {
        baseQuery.createdAt = {
          $gte: new Date(startDate)
        };
      }
      // If only endDate is provided
      else if (!startDate && endDate) {
        baseQuery.createdAt = {
          $lte: new Date(endDate)
        };
      }

      let orderFindQuery = baseQuery;

      // Add search filter if provided
      const findQuery = search == null || search === "" ? { ...orderFindQuery } : {
        $and: [
          { ...orderFindQuery },
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
        ]
      }

      const docCount = await OrdersModel.countDocuments(findQuery);
      const skip = (currentPage - 1) * limit;
      let pageCount;
      if (docCount % limit === 0) {
        pageCount = docCount / limit;
      } else {
        pageCount = Math.floor(docCount / limit) + 1;
      }

      // Get orders with populate
      const response = await OrdersModel
        .find(findQuery)
        .select({ orderDetails: 1, orderStatus: 1, createdAt: 1, updatedAt: 1, payments: 1, customerMobile: 1, calculatedFare: 1 })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      // Manually populate and limit orderDetails to first 5
      const populatedOrders = await Promise.all(
        response.map(async (order) => {
          // Take only first 5 orderDetails
          const limitedOrderDetails = order.orderDetails?.slice(0, 5) || [];

          // Populate productId and inventoryId for each limited orderDetail
          const populatedOrderDetails = await Promise.all(
            limitedOrderDetails.map(async (detail) => {
              const [productDetails, inventoryDetails] = await Promise.all([
                detail.productId ? ProductModel.findById(detail.productId).select({ name: true, metricUnit: true, quantity: true }).lean() : null,
              ]);

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



  async updateOrderDetails(body, tokenDetails) {
    try {
      const { id } = tokenDetails;
      const { dealerId } = id;
      const {
        orderId,
        orderStatus,
        calculatedAs = "retail",
        orderDetails,
        payments = [],
        customerName,
        customerMobile
      } = body;


      // Validate required fields
      const validatorResponse = validator.validate(['orderId'], body);
      if (validatorResponse != null) throw validatorResponse;

      // Validate orderStatus if provided
      const validStatuses = ["onrequest", "ongoing", "oncredit", "rejected", "completed", "returned"];
      if (orderStatus && !validStatuses.includes(orderStatus)) {
        throw new Error(`Invalid order status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Validate calculatedAs if provided
      const validCalculatedAs = ["retail", "wholesale"];
      if (calculatedAs && !validCalculatedAs.includes(calculatedAs)) {
        throw new Error(`Invalid calculation type. Must be one of: ${validCalculatedAs.join(', ')}`);
      }

      // Check if order exists (null-check first to avoid dereferencing null)
      const existingOrder = await OrdersModel.findById(orderId);

      if (!existingOrder) {
        throw new Error("Order not found");
      }

      if (existingOrder.orderStatus == "completed" || existingOrder.orderStatus == "rejected" || existingOrder.orderStatus == "returned") {
        throw "Order status cannot be updated from completed,rejected or returned";
      }

      // Inventory is deducted once the goods leave the store — i.e. when an
      // order is Completed (paid) or On Credit (taken now, paid later).
      // onrequest/ongoing are pre-fulfillment states that don't touch stock.
      const STOCK_DEDUCT_STATUSES = ["completed", "oncredit"];

      // Helper function to check if status requires stock deduction
      const requiresStockDeduction = (status) => {
        return STOCK_DEDUCT_STATUSES.includes(status);
      };

      // Prepare update object
      const updateData = {};

      // Track stock changes for inventory
      let stockChanges = [];

      // Helper function to update stock within the active transaction session.
      const updateStock = async (inventoryId, quantity, operation, session) => {

        const inventory = await DealerInventoryModel.findById(inventoryId).session(session);
        if (!inventory) {
          throw new Error(`Inventory with id ${inventoryId} not found`);
        }

        if (operation === 'decrement') {
          if (inventory.stock < quantity) {
            throw new Error(`Insufficient stock for inventory ${inventoryId}. Available: ${inventory.stock}, Required: ${quantity}`);
          }
          inventory.stock -= quantity;
        } else if (operation === 'increment') {
          inventory.stock += quantity;
        }

        await inventory.save({ session });
        return inventory;
      };

      // Get current and new status
      const oldStatus = existingOrder.orderStatus;
      const newStatus = orderStatus || oldStatus;

      // Whether stock was ACTUALLY deducted before is taken from the persisted
      // flag (authoritative), NOT inferred from the old status — this avoids the
      // bug where legacy oncredit orders (created before oncredit deducted stock)
      // never got deducted and then a move to completed deducted nothing.
      const stockAlreadyApplied = existingOrder.stockApplied === true;
      const newRequiresStock = requiresStockDeduction(newStatus);

      console.log(`Status transition: ${oldStatus} -> ${newStatus} | stockAlreadyApplied: ${stockAlreadyApplied} | newRequiresStock: ${newRequiresStock}`);

      if (orderStatus) {
        updateData.orderStatus = orderStatus;
      }

      // Update calculation type if provided
      if (calculatedAs) {
        updateData.calculatedAs = calculatedAs;
      }

      if (customerName) {
        updateData.customerName = customerName;
      }

      if (customerMobile) {
        updateData.customerMobile = customerMobile;
      }

      // ---------------------------------------------------------------------
      // Build the FINAL item list first (without touching stock). Then derive
      // stock changes from a single net-difference model:
      //   previously-deducted (old items, if old status deducted stock)
      //   vs now-to-deduct      (final items, if new status deducts stock)
      // This is the single source of truth for inventory and avoids the bugs
      // that came from pushing stock changes from multiple places.
      // ---------------------------------------------------------------------

      // Snapshot the OLD item quantities BEFORE any mutation. We later mutate
      // existingItem.count in place (mongoose subdocs), which would otherwise
      // corrupt this baseline and make the net-difference compute to zero.
      const oldItems = (existingOrder.orderDetails || []).map((item) => ({
        inventoryId: item.inventoryId ? item.inventoryId.toString() : null,
        count: item.count || 0
      }));

      let finalItems; // the order's items after this update

      if (orderDetails && Array.isArray(orderDetails) && orderDetails.length > 0) {
        // Validate order details structure
        for (const item of orderDetails) {
          if (!item._id && !item.inventoryId) {
            throw new Error("Each order detail must have _id or inventoryId");
          }
          if (typeof item.count !== 'number' || item.count < 1) {
            throw new Error("Item count must be a positive number");
          }
        }

        const processedOrderDetails = [];
        for (const item of orderDetails) {
          if (item._id) {
            // Update existing item
            const existingItem = existingOrder.orderDetails.id(item._id);
            if (existingItem) {
              existingItem.count = item.count;
              processedOrderDetails.push(existingItem);
            } else {
              throw new Error(`Order item with _id ${item._id} not found`);
            }
          } else if (item.inventoryId) {
            // Add new item
            processedOrderDetails.push({
              productId: item.productId,
              inventoryId: item.inventoryId,
              count: item.count,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }

        updateData.orderDetails = processedOrderDetails;
        finalItems = processedOrderDetails;

        // Recalculate totals with updated items
        const itemsTotal = processedOrderDetails.reduce((total, item) => total + item.count, 0);
        const totalCalculated = await this.calculateTotals(processedOrderDetails);

        updateData.itemsTotal = itemsTotal;
        updateData.totalMrpPrice = totalCalculated.totalMrpPrice;
        updateData.totalDealerPrice = totalCalculated.totalDealerPrice;
        updateData.totalRetailPrice = totalCalculated.totalRetailPrice;
        updateData.totalWholesalePrice = totalCalculated.totalWholesalePrice;
        updateData.calculatedFare = calculatedAs == "retail" ? totalCalculated.totalRetailPrice : totalCalculated.totalWholesalePrice;
      } else {
        // Items not being changed — final items are the existing ones.
        finalItems = oldItems;
      }

      // Helper: sum counts per inventoryId into a Map.
      const sumByInventory = (items, shouldCount) => {
        const map = new Map();
        if (!shouldCount) return map;
        for (const item of items) {
          if (!item.inventoryId) continue;
          const key = item.inventoryId.toString();
          map.set(key, (map.get(key) || 0) + (item.count || 0));
        }
        return map;
      };

      // What was ACTUALLY deducted before (based on the persisted flag, using the
      // old item quantities) vs what should be deducted now (final items, only if
      // the new status deducts stock).
      const previouslyDeducted = sumByInventory(oldItems, stockAlreadyApplied);
      const toDeductNow = sumByInventory(finalItems, newRequiresStock);

      // Net difference per inventoryId → a single decrement/increment each.
      const allInventoryIds = new Set([
        ...previouslyDeducted.keys(),
        ...toDeductNow.keys()
      ]);

      for (const inventoryId of allInventoryIds) {
        const diff = (toDeductNow.get(inventoryId) || 0) - (previouslyDeducted.get(inventoryId) || 0);
        if (diff > 0) {
          stockChanges.push({ inventoryId, quantity: diff, operation: 'decrement' });
        } else if (diff < 0) {
          stockChanges.push({ inventoryId, quantity: Math.abs(diff), operation: 'increment' });
        }
      }

      // Persist whether stock is now applied so future updates compute the net
      // difference correctly regardless of status history.
      updateData.stockApplied = newRequiresStock;

      // Update payments if provided
      if (payments && Array.isArray(payments)) {
        const processedPayments = payments.map(payment => ({
          paymentName: payment.paymentName,
          amount: payment.amount,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        updateData.payments = processedPayments;
      }

      console.log("Update data:", updateData);
      console.log("Stock changes:", stockChanges);

      // Execute stock updates in a transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Apply all stock changes within the transaction session
        for (const change of stockChanges) {
          await updateStock(change.inventoryId, change.quantity, change.operation, session);
        }

        // Update the order
        const updatedOrder = await OrdersModel.findByIdAndUpdate(
          orderId,
          {
            $set: updateData,
            updatedAt: new Date()
          },
          { new: true, session } // Return the updated document and use transaction
        ).populate('orderDetails.productId')
          .populate('orderDetails.inventoryId')
          .populate('dealerId');

        if (!updatedOrder) {
          throw new Error("Failed to update order");
        }

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return {
          status: STATUS_SUCCESS,
          message: "Order updated successfully",
          data: updatedOrder
        };

      } catch (error) {
        // Rollback transaction on error
        await session.abortTransaction();
        session.endSession();
        throw error;
      }

    } catch (err) {
      console.error("Error updating order:", err);
      return {
        status: STATUS_FAILED,
        message: err.message || err + ""
      };
    }
  }

  async calculateTotals(items) {
    try {
      // Extract inventory IDs from items
      const inventoryIds = items
        .map(item => item.inventoryId)
        .filter(id => id)
        .map(id => new mongoose.Types.ObjectId(id));

      if (inventoryIds.length === 0) {
        return {
          totalMrpPrice: 0,
          totalDealerPrice: 0,
          totalRetailPrice: 0,
          totalWholesalePrice: 0
        };
      }

      // Fetch inventory documents
      const inventories = await DealerInventoryModel.find({
        _id: { $in: inventoryIds }
      });

      let totals = {
        totalMrpPrice: 0,
        totalDealerPrice: 0,
        totalRetailPrice: 0,
        totalWholesalePrice: 0
      };

      inventories.forEach(inv => {
        const item = items.find(i => i.inventoryId?.toString() === inv._id.toString());
        const count = item?.count || 0;

        totals.totalMrpPrice += (inv.mrp || 0) * count;
        totals.totalDealerPrice += (inv.dealerPrice || 0) * count;
        totals.totalRetailPrice += (inv.retailPrice || 0) * count;
        totals.totalWholesalePrice += (inv.wholesalePrice || 0) * count;
      });

      return totals;

    } catch (error) {
      console.error("Error calculating totals:", error);
      return {
        totalMrpPrice: 0,
        totalDealerPrice: 0,
        totalRetailPrice: 0,
        totalWholesalePrice: 0
      };
    }
  }

  // Optional: Create a separate method for creating new orders
  async createOrder(body, tokenDetails) {
    try {
      const { id } = tokenDetails;
      const { dealerId } = id;
      const {
        orderDetails,
        calculatedAs = "retail",
        payments = []
      } = body;

      // Validate required fields
      const validatorResponse = validator.validate(['orderDetails'], body);
      if (validatorResponse != null) throw validatorResponse;

      if (!orderDetails || orderDetails.length === 0) {
        throw new Error("Order details are required");
      }

      // Validate calculation type
      const validCalculatedAs = ["retail", "wholesale"];
      if (!validCalculatedAs.includes(calculatedAs)) {
        throw new Error(`Invalid calculation type. Must be one of: ${validCalculatedAs.join(', ')}`);
      }

      // Calculate items total and totals
      const itemsTotal = orderDetails.reduce((total, item) => total + (item.count || 0), 0);
      const totalCalculated = await this.calculateTotals(orderDetails);

      // Process payments
      const processedPayments = payments.map(payment => ({
        paymentName: payment.paymentName,
        amount: payment.amount,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Create new order
      const newOrder = new OrdersModel({
        orderStatus: "onrequest",
        dealerId,
        orderDetails: orderDetails.map(item => ({
          productId: item.productId,
          inventoryId: item.inventoryId,
          count: item.count,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        itemsTotal,
        couponDiscount: 0,
        tax: 0,
        payments: processedPayments,
        calculatedAs,
        ...totalCalculated,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await newOrder.save();

      return {
        status: STATUS_SUCCESS,
        message: "Order placed successfully",
        data: {
          _id: result._id,
          orderStatus: result.orderStatus,
          createdAt: result.createdAt
        }
      };

    } catch (err) {
      console.error("Error creating order:", err);
      return {
        status: STATUS_FAILED,
        message: err.message || err + ""
      };
    }
  }


}

module.exports = OrderServices;