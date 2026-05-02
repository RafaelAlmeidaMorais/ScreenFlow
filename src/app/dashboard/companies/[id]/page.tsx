import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EditCompanyDialog } from "@/components/dashboard/edit-company-dialog";
import { CreateUserDialog } from "@/components/dashboard/create-user-dialog";
import { UserList } from "@/components/dashboard/user-list";
import { ScreenList } from "@/components/dashboard/screen-list";
import { CreateScreenDialog } from "@/components/dashboard/create-screen-dialog";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.isSuperAdmin) redirect("/dashboard");

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { createdAt: "desc" },
      },
      screens: {
        include: { medias: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { medias: true } },
    },
  });

  if (!company) notFound();

  const userData = company.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin,
    companyId: u.companyId,
    companyName: company.name,
    createdAt: u.createdAt.toISOString(),
  }));

  const screenData = company.screens.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    token: s.token,
    isActive: s.isActive,
    intervalSeconds: s.intervalSeconds,
    showProgressBar: s.showProgressBar,
    orientation: s.orientation,
    aspectRatio: s.aspectRatio,
    layoutTemplate: s.layoutTemplate,
    mediaCount: s.medias.length,
    lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard/companies"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Instituições
            </Link>
            <svg className="w-3 h-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-xs text-muted-foreground">{company.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
            <Badge variant="secondary" className="text-xs bg-orange/10 text-orange border border-orange/20">
              /{company.slug}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground/60">{company.users.length} {company.users.length === 1 ? "usuário" : "usuários"}</span>
            <span className="text-xs text-muted-foreground/60">{company.screens.length} {company.screens.length === 1 ? "tela" : "telas"}</span>
            <span className="text-xs text-muted-foreground/60">{company._count.medias} {company._count.medias === 1 ? "mídia" : "mídias"}</span>
          </div>
        </div>
        <EditCompanyDialog company={{ id: company.id, name: company.name, slug: company.slug }} />
      </div>

      {/* Users section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Usuários</h2>
          <CreateUserDialog
            companies={[{ id: company.id, name: company.name }]}
            isSuperAdmin={true}
            defaultCompanyId={company.id}
          />
        </div>
        <UserList
          users={userData}
          currentUserId={session.user.id}
          isSuperAdmin={true}
          companies={[{ id: company.id, name: company.name }]}
        />
      </div>

      {/* Screens section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Telas</h2>
          <CreateScreenDialog companyId={company.id} />
        </div>
        <ScreenList screens={screenData} />
      </div>
    </div>
  );
}
