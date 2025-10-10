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
export const createOrUpdateOTP = async (req: Request, res: Response) => {
  const { userId, type } = req.body; // type = 'email' or 'phone'
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  try {
    // Check if a verification already exists for this user
    const existing = await prisma.verification.findFirst({ where: { userId } });

    if (existing) {
      // Update existing OTP
      await prisma.verification.update({
        where: { id: existing.id },
        data: type === "email"
          ? { emailOtp: otp, expiresAt }
          : { phoneOtp: otp, expiresAt },
      });
    } else {
      // Create new verification
      await prisma.verification.create({
        data: {
          userId,
          emailOtp: type === "email" ? otp : null,
          phoneOtp: type === "phone" ? otp : null,
          expiresAt,
        },
      });
    }

    // Send OTP
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    if (type === "phone") {
      if (!user.phone) throw new Error("User phone not found");
      await twilioClient.messages.create({
        body: `Your OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: user.phone,
      });
    } else if (type === "email") {
      if (!user.email) throw new Error("User email not found");
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your OTP Code",
        text: `Your OTP is ${otp}`,
      });
    }

    res.json({ message: "OTP generated and sent", otp });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const createOrUpdateOTPsign = async (req: Request, res: Response) => {
  const { email, phone, type } = req.body; // type = 'email' or 'phone'
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  try {
    // 1️⃣ Find or create user
    let user = null;
    if (type === "email" && email) {
      user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { phone,email },
      });
    } else if (type === "phone" && phone) {
      user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: { phone },
      });
    } else {
      throw new Error("Email or phone is required for signup OTP");
    }

    // 2️⃣ Find existing verification
    const existing = await prisma.verification.findFirst({ where: { userId: user.id } });

    if (existing) {
      // Update existing OTP
      await prisma.verification.update({
        where: { id: existing.id },
        data: type === "email"
          ? { emailOtp: otp, expiresAt }
          : { phoneOtp: otp, expiresAt },
      });
    } else {
      // Create new verification
      await prisma.verification.create({
        data: {
          userId: user.id,
          emailOtp: type === "email" ? otp : null,
          phoneOtp: type === "phone" ? otp : null,
          expiresAt,
        },
      });
    }

    // 3️⃣ Send OTP
    if (type === "phone" && user.phone) {
      await twilioClient.messages.create({
        body: `Your OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: user.phone,
      });
    } else if (type === "email" && user.email) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your OTP Code",
        text: `Your OTP is ${otp}`,
      });
    }

    res.json({ message: "OTP generated and sent", otp, userId: user.id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};


// Verify OTP
export const verifyOTP = async (req: Request, res: Response) => {
  const { userId, otp, type } = req.body;
  try {
    // Find existing verification
    const verification = await prisma.verification.findFirst({ where: { userId } });
    if (!verification) return res.status(404).json({ error: "No verification found" });

    // Check OTP
    const isValid =
      (type === "email" && verification.emailOtp === otp) ||
      (type === "phone" && verification.phoneOtp === otp);

    if (!isValid) return res.status(400).json({ error: "Invalid OTP" });

    // Mark as verified
    await prisma.verification.update({
      where: { id: verification.id }, // must use unique id
      data:
        type === "email"
          ? { isEmailVerified: true }
          : { isPhoneVerified: true },
    });

    res.json({ message: "Verified successfully" });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};
