import express from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, phone, name } = req.body;
    const user = await prisma.user.create({
      data: { email, phone, name },
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
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
