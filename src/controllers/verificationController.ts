import express from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { generateOTP } from "../services/otpService.js";
import nodemailer from "nodemailer";
import Twilio from "twilio";

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

// Generate or update OTP
export const createOrUpdatePhoneOTP = async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 5 min expiry

  try {
    // 1️⃣ Check if phone already exists in user table
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number already in use" });
    }

    // 2️⃣ Check if verification already exists in PhoneVerification table
    const existingVerification = await prisma.phoneVerification.findUnique({
      where: { phone },
    });

    if (existingVerification) {
      // Update OTP if record exists
      await prisma.phoneVerification.update({
        where: { phone },
        data: {
          otp,
          expiresAt,
          isVerified: false, // reset verification flag
        },
      });
    } else {
      // Create new verification record
      await prisma.phoneVerification.create({
        data: {
          phone,
          otp,
          expiresAt,
        },
      });
    }

    // 3️⃣ Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your verification OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    });

    res.json({ message: "OTP sent successfully", phone });
  } catch (err) {
    console.error("OTP generation error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};


export const createOrUpdateEmailOTP = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 5 min expiry

  try {
    // 1️⃣ Check if email already exists in user table
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // 2️⃣ Check if verification already exists in EmailVerification table
    const existingVerification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (existingVerification) {
      // Update OTP if record exists
      await prisma.emailVerification.update({
        where: { email },
        data: {
          otp,
          expiresAt,
          isVerified: false, // reset verification flag
        },
      });
    } else {
      // Create new verification record
      await prisma.emailVerification.create({
        data: {
          email,
          otp,
          expiresAt,
        },
      });
    }

    // 3️⃣ Send OTP via Nodemailer
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your verification OTP",
      text: `Your OTP is ${otp}`,
    });

    res.json({ message: "OTP sent successfully", email });
  } catch (err) {
    console.error("Email OTP generation error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};



// Verify OTP
// Verify phone OTP
export const verifyPhoneOTP = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP are required" });
  }

  try {
    const verification = await prisma.phoneVerification.findUnique({ where: { phone } });
    if (!verification) return res.status(404).json({ error: "No verification found" });

    if (verification.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await prisma.phoneVerification.update({
      where: { phone },
      data: { isVerified: true },
    });

    res.json({ message: "Phone verified successfully" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// Verify email OTP
export const verifyEmailOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const verification = await prisma.emailVerification.findUnique({ where: { email } });
    if (!verification) return res.status(404).json({ error: "No verification found" });

    if (verification.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await prisma.emailVerification.update({
      where: { email },
      data: { isVerified: true },
    });

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

