const StoreQuery = require("../models/StoreQuery");

// @desc    Create a new store inquiry
// @route   POST /api/store/queries
// @access  Public
exports.createStoreQuery = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, message, type, userId } = req.body;

    if (!firstName || !email || !mobile || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const query = await StoreQuery.create({
      firstName,
      lastName,
      email,
      mobile,
      message,
      type: type || "query",
      user: userId || null
    });

    // Send ticket raised email to the user
    try {
      const emailService = require("../utils/emailService");
      await emailService.sendTicketRaisedNotification(query);
    } catch (mailErr) {
      console.error("Failed to send ticket raised email:", mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: query,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// @desc    Get all store inquiries
// @route   GET /api/store-admin/queries
// @access  Private (Owner/Admin)
exports.getStoreQueries = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) {
      filter.type = type;
    }
    const queries = await StoreQuery.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: queries.length,
      data: queries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// @desc    Update query status
// @route   PUT /api/store-admin/queries/:id
// @access  Private (Owner/Admin)
exports.updateQueryStatus = async (req, res) => {
  try {
    const query = await StoreQuery.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    res.status(200).json({
      success: true,
      data: query,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// @desc    Delete a store inquiry
// @route   DELETE /api/store-admin/queries/:id
// @access  Private (Owner/Admin)
exports.deleteStoreQuery = async (req, res) => {
  try {
    const query = await StoreQuery.findByIdAndDelete(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Query deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// @desc    Get logged in customer support queries
// @route   GET /api/store/queries/my-queries
// @access  Private
exports.getMyQueries = async (req, res) => {
  try {
    const queries = await StoreQuery.find({
      type: "ticket",
      $or: [
        { email: req.user.email },
        { mobile: req.user.mobile }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: queries.length,
      data: queries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error"
    });
  }
};

// @desc    Reply to a support query and send email
// @route   POST /api/store-admin/queries/:id/reply
// @access  Private (Owner/Admin)
exports.replyToQuery = async (req, res) => {
  try {
    const { replyMessage } = req.body;
    if (!replyMessage || !replyMessage.trim()) {
      return res.status(400).json({ success: false, message: "Reply message cannot be empty" });
    }

    const query = await StoreQuery.findById(req.params.id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    query.response = replyMessage;
    query.status = "responded";
    query.isRead = true;
    await query.save();

    // Send email notification to user with the staff's reply
    try {
      const emailService = require("../utils/emailService");
      await emailService.sendTicketUpdateNotification(query, replyMessage);
    } catch (mailErr) {
      console.error("Failed to send ticket update email:", mailErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Reply sent and query updated successfully",
      data: query
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error"
    });
  }
};
