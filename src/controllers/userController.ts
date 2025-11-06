import express from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import jwt from "jsonwebtoken";
 // adjust path as needed

// Use an environment variable for the secret key
const JWT_SECRET = process.env.JWT_SECRET || "dogitis";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { phone, name, gender, dob } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    // 1️⃣ Verify phone number
    const phoneVerification = await prisma.phoneVerification.findUnique({
      where: { phone },
    });

    if (!phoneVerification || !phoneVerification.isVerified) {
      return res.status(400).json({ error: "Phone number not verified." });
    }

    // 2️⃣ Prevent duplicates
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists with this phone number.",
      });
    }

    // 3️⃣ Create user (without userCode first)
    let age: number | undefined = undefined;
    if (dob) {
      const birth = new Date(dob);
      const now = new Date();
      age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
    }

    const user = await prisma.user.create({
      data: {
        phone,
        name,
        gender,
        dob: dob ? new Date(dob) : undefined,
        age,
      },
    });

    // 4️⃣ Generate userCode ("U0001" style)
    const formattedCode = `U${String(user.id).padStart(4, "0")}`;
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { userCode: formattedCode },
    });

    // 5️⃣ Generate JWT token
    const token = jwt.sign(
      { id: updatedUser.id, name: updatedUser.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6️⃣ Return success response
    res.status(201).json({
      message: "User created successfully",
      token,
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const addOrUpdateEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    // 1️⃣ Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token missing or invalid." });
    }

    const token = authHeader.split(" ")[1];

    // 2️⃣ Verify and decode the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: number; name?: string };
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const userId = decoded.id;

    // 3️⃣ Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // 4️⃣ Check if the email is verified
    const emailVerification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!emailVerification || !emailVerification.isVerified) {
      return res
        .status(400)
        .json({ error: "Email is not verified. Please verify before linking." });
    }

    // 5️⃣ Check if email already belongs to another user
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserWithEmail && existingUserWithEmail.id !== user.id) {
      return res
        .status(400)
        .json({ error: "Email is already in use by another user." });
    }

    // 6️⃣ Update user's email
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email },
    });

    // 7️⃣ Invalidate email verification entry (optional)
    await prisma.emailVerification.update({
      where: { email },
      data: { isVerified: false },
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
