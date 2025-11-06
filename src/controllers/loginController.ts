import express from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { generateOTP } from "../services/otpService.js";
import nodemailer from "nodemailer";
import Twilio from "twilio";
import jwt from "jsonwebtoken";
 // adjust path as needed

// Use an environment variable for the secret key
const JWT_SECRET = process.env.JWT_SECRET || "dogitis";

// Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioClient = Twilio(accountSid, authToken);

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendPhoneOtp = async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  try {
    // 1️⃣ Ensure phone exists in user table (for login)
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found. Please sign up first." });
    }

    // 2️⃣ Create or update OTP in PhoneVerification table
    await prisma.phoneVerification.upsert({
      where: { phone }, // phone must be unique
      update: {
        otp,
        expiresAt,
        isVerified: false,
      },
      create: {
        phone,
        otp,
        expiresAt,
        isVerified: false,
      },
    });

    // 3️⃣ Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your login OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    });

    res.json({ message: "Login OTP sent successfully", phone });
  } catch (err) {
    console.error("Login OTP send error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const verifyPhoneOtp= async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP are required" });
  }

  try {
    // 1️⃣ Find the verification record (if expired, it won't exist)
    const verification = await prisma.phoneVerification.findUnique({
      where: { phone },
    });

    if (!verification) {
      return res
        .status(404)
        .json({ error: "OTP expired or not requested. Please request a new one." });
    }

    // 2️⃣ Compare OTP
    if (verification.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // 3️⃣ Mark verified
    await prisma.phoneVerification.update({
      where: { phone },
      data: { isVerified: true },
    });

    // 4️⃣ Check if user exists
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return res.status(404).json({
        error: "User not found. Please sign up first.",
      });
    }

    // 5️⃣ Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6️⃣ Return success response
    return res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
};
