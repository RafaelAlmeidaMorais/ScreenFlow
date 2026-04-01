import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.media.deleteMany();
  await prisma.screen.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Create company
  const company = await prisma.company.create({
    data: {
      name: "Igreja Esperança",
      slug: "igreja-esperanca",
    },
  });

  // Create super admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "admin@esperanca.com",
      name: "Administrador",
      password: hashedPassword,
      role: "COMPANY_ADMIN",
      isSuperAdmin: true,
    },
  });

  // Create 3 screens
  const screen1 = await prisma.screen.create({
    data: {
      companyId: company.id,
      name: "Tela Principal - Lobby",
      slug: "lobby-principal",
      description: "Tela de boas-vindas na entrada principal",
      token: uuidv4(),
      intervalSeconds: 10,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });

  const screen2 = await prisma.screen.create({
    data: {
      companyId: company.id,
      name: "Tela Salão de Eventos",
      slug: "salao-eventos",
      description: "Programação de eventos e avisos",
      token: uuidv4(),
      intervalSeconds: 15,
      isActive: true,
      lastSeenAt: new Date(Date.now() - 3600000),
    },
  });

  const screen3 = await prisma.screen.create({
    data: {
      companyId: company.id,
      name: "Tela Corredor Administrativo",
      slug: "corredor-administrativo",
      description: "Comunicados internos",
      token: uuidv4(),
      intervalSeconds: 8,
      isActive: false,
      lastSeenAt: null,
    },
  });

  // Create 5 medias
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await prisma.media.createMany({
    data: [
      {
        screenId: screen1.id,
        companyId: company.id,
        type: "IMAGE",
        fileUrl: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1920&h=1080&fit=crop",
        title: "Bem-vindos à Igreja Esperança",
        durationSeconds: 10,
        orderIndex: 0,
        startDate: now,
        endDate: nextMonth,
        isEnabled: true,
        createdById: admin.id,
      },
      {
        screenId: screen1.id,
        companyId: company.id,
        type: "IMAGE",
        fileUrl: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=1080&fit=crop",
        title: "Culto Domingo - 19h",
        durationSeconds: 8,
        orderIndex: 1,
        startDate: now,
        endDate: nextMonth,
        isEnabled: true,
        createdById: admin.id,
      },
      {
        screenId: screen2.id,
        companyId: company.id,
        type: "IMAGE",
        fileUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1920&h=1080&fit=crop",
        title: "Agenda de Eventos - Março",
        durationSeconds: 12,
        orderIndex: 0,
        startDate: now,
        endDate: nextMonth,
        isEnabled: true,
        createdById: admin.id,
      },
      {
        screenId: screen2.id,
        companyId: company.id,
        type: "VIDEO",
        fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        title: "Vídeo Institucional",
        durationSeconds: 30,
        orderIndex: 1,
        startDate: lastWeek,
        endDate: lastWeek,
        isEnabled: true,
        createdById: admin.id,
      },
      {
        screenId: screen3.id,
        companyId: company.id,
        type: "IMAGE",
        fileUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=1080&fit=crop",
        title: "Comunicado Interno - RH",
        durationSeconds: 10,
        orderIndex: 0,
        startDate: now,
        endDate: null,
        isEnabled: true,
        createdById: admin.id,
      },
    ],
  });

  console.log("✅ Seed completed!");
  console.log(`   Company: ${company.name}`);
  console.log(`   Admin: ${admin.email} / admin123 (Super Admin)`);
  console.log(`   Screens: 3 (slugs: lobby-principal, salao-eventos, corredor-administrativo)`);
  console.log(`   Medias: 5`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
