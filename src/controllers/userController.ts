import express from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";


export const createUser = async (req: Request, res: Response) => {
  try {
    const { phone, name, gender, dob } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    //  Check if the phone number is verified
    const phoneVerification = await prisma.phoneVerification.findUnique({
      where: { phone },
    });

    if (!phoneVerification || !phoneVerification.isVerified) {
      return res.status(400).json({ error: "Phone number not verified." });
    }

    //  Prevent creating duplicate users
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this phone number." });
    }

    // Create the user (email ignored)
    const user = await prisma.user.create({
      data: {
        phone,
        name,
        gender,
        dob: dob ? new Date(dob) : undefined,
      },
    });

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(400).json({ error: (err as Error).message });
  }
};

export const addOrUpdateEmail = async (req: Request, res: Response) => {
  try {
    const { id, email } = req.body;

    if (!id || !email) {
      return res.status(400).json({ error: "User ID and email are required." });
    }

    // 1️⃣ Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // 2️⃣ Check if the email exists and is verified
    const emailVerification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!emailVerification || !emailVerification.isVerified) {
      return res
        .status(400)
        .json({ error: "Email is not verified. Please verify before linking." });
    }

    // 3️⃣ Check if the email is already used by another user
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserWithEmail && existingUserWithEmail.id !== user.id) {
      return res
        .status(400)
        .json({ error: "Email is already in use by another user." });
    }

    // 4️⃣ Update user's email
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { email },
    });

    // 5️⃣ (Optional) Invalidate the email verification entry
    await prisma.emailVerification.update({
      where: { email },
      data: { isVerified: false }, // reset so it can’t be reused
    });

    res.status(200).json({
      message: "Email added/updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating email:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};
