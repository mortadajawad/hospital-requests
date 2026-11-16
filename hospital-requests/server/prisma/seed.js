import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const departments = [
  "Laboratory",
  "Radiology",
  "Pharmacy",
  "Emergency",
  "Maintenance",
  "IT",
  "Nursing",
];
const categories = [
  "Equipment",
  "System Support",
  "IT Support",
  "Supplies",
  "Maintenance",
  "Scheduling",
  "Other",
];

async function main() {
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const email = "admin@hospital.local";
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "System Admin", email, passwordHash, role: "ADMIN" },
  });

  console.log(
    "Seeded. Login: admin@hospital.local / ChangeMe123!  (change it right away)",
  );
}

main().finally(() => prisma.$disconnect());
