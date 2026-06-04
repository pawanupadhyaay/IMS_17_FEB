const StoreQuery = require("../models/StoreQuery");

// @desc    Create a new store inquiry
// @route   POST /api/store/queries
// @access  Public
exports.createStoreQuery = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, message } = req.body;

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
    });

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
    const queries = await StoreQuery.find().sort({ createdAt: -1 });

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
