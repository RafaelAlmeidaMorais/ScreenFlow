import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isSuperAdmin: boolean;
      companyId: string;
      companyName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isSuperAdmin?: boolean;
    companyId?: string;
    companyName?: string;
  }
}
