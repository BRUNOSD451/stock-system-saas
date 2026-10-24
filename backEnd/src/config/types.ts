export type CompanyStatus = "trial" | "active" | "past_due" | "canceled" | "suspended";

export interface companyInterface {
  companyId: number;
  name: string;
  email: string;
  logoUrl: string | null;
  plan: string;
  status: CompanyStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  lowStockThreshold: number;
  ownerUserId: number | null;
  createdAt: Date;
}

export interface userInterface {
  userId: number;
  companyId?: number | null;
  userName: string;
  userCellNumber: string;
  userPosition: string;
  password: string;
    imageUrl?: string | null;
  mustChangePassword?: boolean | number;
  tokenVersion?: number;
}