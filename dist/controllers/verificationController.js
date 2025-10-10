import express from "express";
import prisma from "../utils/prisma.js";
import { generateOTP } from "../services/otpService.js";
import nodemailer from "nodemailer";
import Twilio from "twilio";
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
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
export const createOrUpdateOTP = async (req, res) => {
    const { userId, type } = req.body; // type = 'email' or 'phone'
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
    try {
        // Upsert OTP row
        const verification = await prisma.verification.upsert({
            where: { userId },
            update: type === "email"
                ? { emailOtp: otp, expiresAt }
                : { phoneOtp: otp, expiresAt },
            create: {
                userId,
                emailOtp: type === "email" ? otp : null,
                phoneOtp: type === "phone" ? otp : null,
                expiresAt,
            },
        });
        // Send OTP
        if (type === "phone") {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user?.phone)
                throw new Error("User phone not found");
            await twilioClient.messages.create({
                body: `Your OTP is ${otp}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.phone,
            });
        }
        else if (type === "email") {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user?.email)
                throw new Error("User email not found");
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Your OTP Code",
                text: `Your OTP is ${otp}`,
            });
        }
        res.json({ message: "OTP generated and sent", otp });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
export const verifyOTP = async (req, res) => {
    const { userId, otp, type } = req.body;
    try {
        const verification = await prisma.verification.findUnique({ where: { userId } });
        if (!verification)
            return res.status(404).json({ error: "No verification found" });
        if ((type === "email" && verification.emailOtp === otp) ||
            (type === "phone" && verification.phoneOtp === otp)) {
            await prisma.verification.update({
                where: { userId },
                data: type === "email"
                    ? { isEmailVerified: true }
                    : { isPhoneVerified: true },
            });
            return res.json({ message: "Verified successfully" });
        }
        res.status(400).json({ error: "Invalid OTP" });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
//# sourceMappingURL=verificationController.js.map