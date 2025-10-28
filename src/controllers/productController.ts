import express from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import jwt from "jsonwebtoken";