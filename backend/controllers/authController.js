const User = require("../models/User");
const Otp = require("../models/Otp");
const nodemailer = require("nodemailer");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      mobile,
      password,
    });

    if (user) {
      const token = user.generateToken();
      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          hasSeoAccess: user.hasSeoAccess || false,
          allowedBrands: user.allowedBrands || [],
          canEditProducts: user.canEditProducts ?? true,
          canViewStats: user.canViewStats ?? true,
          canEditBasicInfo: user.canEditBasicInfo ?? true,
          canEditSeo: user.canEditSeo ?? true,
          canAccessFilters: user.canAccessFilters ?? true,
        },
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt locally:", email);

    // Validate email & password
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    // Check for user (case-insensitive & trimmed matching)
    const formattedEmail = email.toLowerCase().trim();
    const escapedEmail = formattedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') }
    }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = user.generateToken();
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        hasSeoAccess: user.hasSeoAccess || false,
        allowedBrands: user.allowedBrands || [],
        canEditProducts: user.canEditProducts ?? true,
        canViewStats: user.canViewStats ?? true,
        canEditBasicInfo: user.canEditBasicInfo ?? true,
        canEditSeo: user.canEditSeo ?? true,
        canAccessFilters: user.canAccessFilters ?? true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        hasSeoAccess: user.hasSeoAccess || false,
        allowedBrands: user.allowedBrands || [],
        canEditProducts: user.canEditProducts ?? true,
        canViewStats: user.canViewStats ?? true,
        canEditBasicInfo: user.canEditBasicInfo ?? true,
        canEditSeo: user.canEditSeo ?? true,
        canAccessFilters: user.canAccessFilters ?? true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send OTP
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Generate 4-digit OTP
    const otpValue = Math.floor(1000 + Math.random() * 9000).toString();

    // Save/Update to DB (Delete any existing OTPs for this email first)
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpValue });

    // Send email using nodemailer
    // Fallback to console if env vars are missing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`[TEST MODE] OTP for ${email}: ${otpValue}`);
      return res.status(200).json({ success: true, message: "OTP sent (check console)" });
    }

    let transporterConfig;
    if (process.env.EMAIL_HOST) {
      transporterConfig = {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 465,
        secure: process.env.EMAIL_SECURE === 'true' || Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      };
    } else {
      transporterConfig = {
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    const senderEmail = process.env.EMAIL_FROM || `"Samay Watch" <orders@samaywatch.in>`;

    const mailOptions = {
      from: senderEmail,
      to: email,
      subject: "Your Registration OTP - Samay Watches",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0a1638; text-align: center;">Samay Watch</h2>
          <p>Hello ${name || 'User'},</p>
          <p>Thank you for registering. Your One-Time Password (OTP) is:</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #d4af37; text-align: center; background: #f9f9f9; padding: 15px; border-radius: 5px;">${otpValue}</h1>
          <p>This OTP is valid for 5 minutes. Please do not share this with anyone.</p>
          <p style="color: #888; font-size: 12px; text-align: center; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "OTP sent to your email" });

  } catch (error) {
    console.error("OTP send error:", error);
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, mobile } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (mobile) {
      // Basic validation: 10 digits
      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: "Please provide a valid 10-digit mobile number" });
      }
      user.mobile = mobile;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        hasSeoAccess: user.hasSeoAccess || false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password - Sends Verification OTP Code
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide an email address" });
    }

    const formattedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: formattedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email" });
    }

    // Generate 4-digit code
    const otpValue = Math.floor(1000 + Math.random() * 9000).toString();

    // Store in DB (Clear previous OTPs for this email first)
    await Otp.deleteMany({ email: formattedEmail });
    await Otp.create({ email: formattedEmail, otp: otpValue });

    // Send reset code email using Nodemailer
    // Bypass immediately if placeholder values are detected
    const isPlaceholder = !process.env.EMAIL_USER || 
                          !process.env.EMAIL_PASS || 
                          process.env.EMAIL_USER.includes('aapkiemail') || 
                          process.env.EMAIL_PASS.includes('aapka_16_digit');

    if (isPlaceholder) {
      console.log(`\n🔑 [DEV SIMULATION MODE] Password Reset OTP for ${formattedEmail}: ${otpValue}\n`);
      return res.status(200).json({ 
        success: true, 
        message: "Password reset code generated (Dev Mode active: check server console for code)" 
      });
    }

    try {
      let transporterConfig;
      if (process.env.EMAIL_HOST) {
        transporterConfig = {
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT) || 465,
          secure: process.env.EMAIL_SECURE === 'true' || Number(process.env.EMAIL_PORT) === 465,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        };
      } else {
        transporterConfig = {
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      const senderEmail = process.env.EMAIL_FROM || `"Samay Watch" <orders@samaywatch.in>`;

      const mailOptions = {
        from: senderEmail,
        to: formattedEmail,
        subject: "Password Reset Code - Samay Watch",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
              <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Premium Timepieces</p>
            </div>
            
            <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000;">Password Reset Code</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>We received a request to reset the password for your Samay Watch account. Use the following verification code to proceed:</p>
            
            <h1 style="font-size: 36px; letter-spacing: 6px; color: #b91c1c; text-align: center; background: #f9f9f9; padding: 15px; border-radius: 10px; font-family: monospace; border: 1px dashed #ddd; margin: 20px 0;">${otpValue}</h1>
            
            <p>This code is valid for <strong>5 minutes</strong>. If you did not make this request, you can safely ignore this email and your password will remain unchanged.</p>
            
            <div style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #999;">
              <strong>Samay Watch</strong> (GSTIN - 07AANFS0947D1Z5)<br/>
              Main Market, Bada Gol Chakkar, 10-F, Near Sparks Mall, Kamla Nagar, Block F, Kamla Nagar, New Delhi, Delhi - 110007<br/>
              If you have any inquiries, please contact us at orders@samaywatch.in
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true, message: "Password reset code sent to your email" });
    } catch (smtpError) {
      console.warn("⚠️ SMTP Mail Transport Authentication failed. Falling back to Console simulation.");
      console.warn(smtpError.message);
      console.log(`\n🔑 [DEV SIMULATION MODE] Password Reset OTP for ${formattedEmail}: ${otpValue}\n`);
      
      res.status(200).json({ 
        success: true, 
        message: "Password reset code generated (Dev Mode active: check server console for code)" 
      });
    }

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Failed to send reset code", error: error.message });
  }
};

// @desc    Reset Password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ success: false, message: "Please provide email, code, and new password" });
    }

    const formattedEmail = email.toLowerCase().trim();
    
    // Verify OTP first
    const otpRecord = await Otp.findOne({ email: formattedEmail, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    // Find User
    const user = await User.findOne({ email: formattedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }

    // Update password (pre-save hook hashes it automatically)
    user.password = password;
    await user.save();

    // Delete verified OTP record
    await Otp.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Failed to reset password", error: error.message });
  }
};

// @desc    Send OTP to Mobile Number
// @route   POST /api/auth/phone-login/send-otp
// @access  Public
const sendPhoneOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Validate basic Indian phone number length (10 digits)
    const phoneRegex = /^\d{10}$/;
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!phoneRegex.test(cleanMobile)) {
      return res.status(400).json({ message: "Please provide a valid 10-digit mobile number" });
    }

    // Generate 6-digit OTP code
    const otpValue = Math.floor(100000 + Math.random() * 900000).toString();

    // Clear any existing phone OTPs for this number and create a new one
    await Otp.deleteMany({ mobile: cleanMobile });
    await Otp.create({ mobile: cleanMobile, otp: otpValue });

    // In DEV Simulation / Free Mode, we log OTP to server console and reply with it in response
    console.log(`\n📱 [SMS OTP SIMULATION] OTP Code for +91 ${cleanMobile} is: [ ${otpValue} ]\n`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully (Simulated Code)",
      devOtp: otpValue // Return OTP directly in response for frictionless developer testing!
    });
  } catch (error) {
    console.error("Send phone OTP error:", error);
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

// @desc    Verify Mobile OTP Code
// @route   POST /api/auth/phone-login/verify-otp
// @access  Public
const verifyPhoneOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile number and OTP are required" });
    }

    const cleanMobile = mobile.replace(/\D/g, '');

    // Verify OTP record
    const otpRecord = await Otp.findOne({ mobile: cleanMobile, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    // OTP verified, delete it
    await Otp.deleteOne({ _id: otpRecord._id });

    // Check if user already exists
    const user = await User.findOne({ mobile: cleanMobile });
    if (user) {
      // Existing User: Login directly
      const token = user.generateToken();
      return res.status(200).json({
        success: true,
        isNewUser: false,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          hasSeoAccess: user.hasSeoAccess || false,
        }
      });
    }

    // New User: Require registration profile completion
    res.status(200).json({
      success: true,
      isNewUser: true,
      message: "OTP verified. Registration required."
    });
  } catch (error) {
    console.error("Verify phone OTP error:", error);
    res.status(500).json({ message: "Failed to verify OTP", error: error.message });
  }
};

// @desc    Complete Profile Registration for verified phone number
// @route   POST /api/auth/phone-login/complete-registration
// @access  Public
const completePhoneRegistration = async (req, res) => {
  try {
    const { mobile, firstName, lastName, email } = req.body;
    if (!mobile || !firstName || !lastName || !email) {
      return res.status(400).json({ message: "Please provide all required profile fields" });
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanEmail = email.toLowerCase().trim();

    // Prevent duplicate email registration
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // Prevent duplicate mobile registration
    const mobileExists = await User.findOne({ mobile: cleanMobile });
    if (mobileExists) {
      return res.status(400).json({ message: "An account with this mobile number already exists" });
    }

    // Generate a secure random password for DB requirements (users will log in via OTP)
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    // Create the User profile
    const user = await User.create({
      name: `${firstName} ${lastName}`.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password: randomPassword,
      role: 'user', // Default customer role
    });

    const token = user.generateToken();

    // Trigger asynchronous Welcome Email (non-blocking)
    setImmediate(async () => {
      try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          console.log(`[TEST MODE] Welcome Email simulated for: ${user.email}`);
          return;
        }

        let transporterConfig;
        if (process.env.EMAIL_HOST) {
          transporterConfig = {
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 465,
            secure: process.env.EMAIL_SECURE === 'true' || Number(process.env.EMAIL_PORT) === 465,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            tls: {
              rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
          };
        } else {
          transporterConfig = {
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          };
        }

        const transporter = nodemailer.createTransport(transporterConfig);
        const senderEmail = process.env.EMAIL_FROM || `"Samay Watch" <orders@samaywatch.in>`;

        const mailOptions = {
          from: senderEmail,
          to: user.email,
          subject: "Welcome to Samay Watch!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
                <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Premium Timepieces</p>
              </div>
              
              <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000;">Account Activated Successfully</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Welcome to Samay Watch. Your customer account has been successfully created and verified using your mobile number <strong>+91 ${user.mobile}</strong>.</p>
              
              <p>Next time you shop with us, simply log in using your mobile number for a faster, frictionless checkout experience.</p>
              
              <div style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #999;">
                <strong>Samay Watch</strong> (GSTIN - 07AANFS0947D1Z5)<br/>
                Main Market, Bada Gol Chakkar, 10-F, Near Sparks Mall, Kamla Nagar, Block F, Kamla Nagar, New Delhi, Delhi - 110007<br/>
                If you have any inquiries, please contact us at orders@samaywatch.in
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email dispatched successfully to ${user.email}`);
      } catch (err) {
        console.error("❌ Failed to send welcome email:", err);
      }
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        hasSeoAccess: user.hasSeoAccess || false,
      }
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    res.status(500).json({ message: "Failed to complete registration", error: error.message });
  }
};

// @desc    Send OTP to Email Address for login/signup
// @route   POST /api/auth/email-login/send-otp
// @access  Public
const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Generate 6-digit OTP code
    const otpValue = Math.floor(100000 + Math.random() * 900000).toString();

    // Clear any existing OTPs for this email and create a new one
    await Otp.deleteMany({ email: cleanEmail });
    await Otp.create({ email: cleanEmail, otp: otpValue });

    // Send email using our verified Hostinger SMTP
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`\n📧 [EMAIL OTP SIMULATION] OTP Code for ${cleanEmail} is: [ ${otpValue} ]\n`);
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully (Simulated Code)",
        devOtp: otpValue // Return OTP directly in response for frictionless developer testing!
      });
    }

    let transporterConfig;
    if (process.env.EMAIL_HOST) {
      transporterConfig = {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 465,
        secure: process.env.EMAIL_SECURE === 'true' || Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      };
    } else {
      transporterConfig = {
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);
    const senderEmail = process.env.EMAIL_FROM || `"Samay Watch" <orders@samaywatch.in>`;

    const mailOptions = {
      from: senderEmail,
      to: cleanEmail,
      subject: "Login Verification Code - Samay Watch",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
            <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Login Verification</p>
          </div>
          
          <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000;">Verification Code</h2>
          <p>Hello,</p>
          <p>To log in or register for your Samay Watch account, please use the following 6-digit One-Time Password (OTP) verification code:</p>
          
          <h1 style="font-size: 36px; letter-spacing: 6px; color: #b91c1c; text-align: center; background: #f9f9f9; padding: 15px; border-radius: 10px; font-family: monospace; border: 1px dashed #ddd; margin: 20px 0;">${otpValue}</h1>
          
          <p>This code is valid for <strong>5 minutes</strong>. Please do not share this OTP with anyone.</p>
          
          <div style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #999;">
            <strong>Samay Watch</strong> (GSTIN - 07AANFS0947D1Z5)<br/>
            Main Market, Bada Gol Chakkar, 10-F, Near Sparks Mall, Kamla Nagar, Block F, Kamla Nagar, New Delhi, Delhi - 110007<br/>
            If you have any inquiries, please contact us at orders@samaywatch.in
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "OTP sent to your email successfully" });

  } catch (error) {
    console.error("Send email OTP error:", error);
    res.status(500).json({ message: "Failed to send email OTP", error: error.message });
  }
};

// @desc    Verify Email OTP Code
// @route   POST /api/auth/email-login/verify-otp
// @access  Public
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email address and OTP are required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP record
    const otpRecord = await Otp.findOne({ email: cleanEmail, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    // OTP verified, delete it
    await Otp.deleteOne({ _id: otpRecord._id });

    // Check if user already exists
    const user = await User.findOne({ email: cleanEmail });
    if (user) {
      // Existing User: Login directly
      const token = user.generateToken();
      return res.status(200).json({
        success: true,
        isNewUser: false,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          hasSeoAccess: user.hasSeoAccess || false,
        }
      });
    }

    // New User: Require registration profile completion
    res.status(200).json({
      success: true,
      isNewUser: true,
      message: "OTP verified. Registration required."
    });
  } catch (error) {
    console.error("Verify email OTP error:", error);
    res.status(500).json({ message: "Failed to verify email OTP", error: error.message });
  }
};

// @desc    Complete Profile Registration for verified email address
// @route   POST /api/auth/email-login/complete-registration
// @access  Public
const completeEmailRegistration = async (req, res) => {
  try {
    const { email, firstName, lastName, mobile } = req.body;
    if (!email || !firstName || !lastName || !mobile) {
      return res.status(400).json({ message: "Please provide all required profile fields" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanMobile = mobile.replace(/\D/g, '');

    // Prevent duplicate mobile number registration
    const mobileExists = await User.findOne({ mobile: cleanMobile });
    if (mobileExists) {
      return res.status(400).json({ message: "An account with this mobile number already exists" });
    }

    // Prevent duplicate email registration
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // Generate secure random password for database constraints
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    // Create the User profile
    const user = await User.create({
      name: `${firstName} ${lastName}`.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password: randomPassword,
      role: 'user', // Default customer role
    });

    const token = user.generateToken();

    // Trigger asynchronous Welcome Email (non-blocking)
    setImmediate(async () => {
      try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          console.log(`[TEST MODE] Welcome Email simulated for: ${user.email}`);
          return;
        }

        let transporterConfig;
        if (process.env.EMAIL_HOST) {
          transporterConfig = {
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 465,
            secure: process.env.EMAIL_SECURE === 'true' || Number(process.env.EMAIL_PORT) === 465,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            tls: {
              rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
          };
        } else {
          transporterConfig = {
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          };
        }

        const transporter = nodemailer.createTransport(transporterConfig);
        const senderEmail = process.env.EMAIL_FROM || `"Samay Watch" <orders@samaywatch.in>`;

        const mailOptions = {
          from: senderEmail,
          to: user.email,
          subject: "Welcome to Samay Watch!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
                <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Premium Timepieces</p>
              </div>
              
              <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000;">Account Activated Successfully</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Welcome to Samay Watch. Your customer account has been successfully created and verified using your email address <strong>${user.email}</strong>.</p>
              
              <p>Next time you shop with us, simply log in using your registered email address for a faster, frictionless checkout experience.</p>
              
              <div style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #999;">
                <strong>Samay Watch</strong> (GSTIN - 07AANFS0947D1Z5)<br/>
                Main Market, Bada Gol Chakkar, 10-F, Near Sparks Mall, Kamla Nagar, Block F, Kamla Nagar, New Delhi, Delhi - 110007<br/>
                If you have any inquiries, please contact us at orders@samaywatch.in
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email dispatched successfully to ${user.email}`);
      } catch (err) {
        console.error("❌ Failed to send welcome email:", err);
      }
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        hasSeoAccess: user.hasSeoAccess || false,
      }
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    res.status(500).json({ message: "Failed to complete registration", error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide current and new passwords" });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user.addresses || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addAddress = async (req, res) => {
  try {
    const { fullName, addressLine1, addressLine2, city, state, pincode, phone, isDefault } = req.body;

    if (!fullName || !addressLine1 || !city || !state || !pincode || !phone) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const user = await User.findById(req.user.id);

    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    const newAddress = {
      fullName,
      addressLine1,
      addressLine2: addressLine2 || "",
      city,
      state,
      pincode,
      phone,
      isDefault: isDefault || user.addresses.length === 0
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Address added successfully",
      data: user.addresses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { fullName, addressLine1, addressLine2, city, state, pincode, phone, isDefault } = req.body;
    const user = await User.findById(req.user.id);

    const address = user.addresses.id(req.params.id);
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    if (isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== req.params.id) {
          addr.isDefault = false;
        }
      });
    }

    if (fullName) address.fullName = fullName;
    if (addressLine1) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (city) address.city = city;
    if (state) address.state = state;
    if (pincode) address.pincode = pincode;
    if (phone) address.phone = phone;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: user.addresses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const address = user.addresses.id(req.params.id);
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    user.addresses.pull({ _id: req.params.id });

    if (address.isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: user.addresses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  sendOtp,
  updateProfile,
  forgotPassword,
  resetPassword,
  sendPhoneOtp,
  verifyPhoneOtp,
  completePhoneRegistration,
  sendEmailOtp,
  verifyEmailOtp,
  completeEmailRegistration,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress
};

