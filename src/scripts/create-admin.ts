/**
 * Creates the initial Super Admin account.
 * Run once after clearing the database.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import User from "../models/User";
import Wallet from "../models/Wallet";

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const existing = await User.findOne({ email: "admin@namaah.in" });
  if (existing) {
    console.log("Super admin already exists.");
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({
    name: "Super Admin",
    email: "admin@namaah.in",
    password: "Admin@123",
    role: "admin",
    employeeId: "SA001",
    department: "Management",
    designation: "Super Administrator",
    joiningDate: new Date(),
  });

  await Wallet.create({ employee: admin._id });

  console.log("✅ Super Admin created.");
  console.log("   Email   : admin@namaah.in");
  console.log("   Password: Admin@123");
  await mongoose.disconnect();
}

createAdmin().catch((e) => { console.error(e); process.exit(1); });
