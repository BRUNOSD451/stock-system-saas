

export interface User {
    userId: number;
    userName: string;
    userCellNumber: string;
    userPosition: string;
    password?: string;
    imageUrl?: string | null;
    mustChangePassword?: boolean;
}

export type CompanyStatus = "trial" | "active" | "past_due" | "canceled" | "suspended";

export interface Company {
    companyId: number;
    name: string;
    email?: string;
    logoUrl?: string | null;
    plan: string;
    status: CompanyStatus | string;
    trialEndsAt: string | null;
    lowStockThreshold?: number;
    createdAt?: string;
    // Assinatura inativa (teste vencido, pagamento atrasado, cancelada ou suspensa): só consulta.
    trialExpired?: boolean;
    // Fim do mês pago do Pro; periodEnded quando venceu sem renovação.
    currentPeriodEnd?: string | null;
    periodEnded?: boolean;
    readOnly?: boolean;
}

// GET /billing: situação da empresa e o plano que pode ser assinado.
export interface BillingOverview {
    company: Company;
    // Cada pagamento libera periodMonths meses de Pro.
    plan: { id: string; label: string; monthlyPriceCents: number; periodMonths: number };
    canSubscribe: boolean;
    // false quando o backend ainda não tem gateway configurado.
    billingAvailable: boolean;
}

export interface Notification {
    notificationId: number;
    notificationName: string;
    notificationText: string;
    status: number | boolean;
    userId: number;
    createdAt:string
}

export interface Category {
    categoryId: number;
    name: string;
}

export interface Product {
    productId: number;
    name: string;
    // Código interno, SKU ou código de barras; único por empresa.
    sku?: string | null;
    description: string | null;
    price: number;
    stockQuantity: number;
    // Unidade de medida (un, kg, sc…); a quantidade continua inteira.
    unit?: string;
    categoryId: number;
    supplierId: number | null;
    imageUrl?: string | null;
    // 1/true = ativo; inativo sai das listas de movimentação e da reposição.
    active?: number | boolean;
    createdAt?: string;
}

// regular: comum; reversal: estorno de outra movimentação; adjustment: ajuste de inventário.
export type MovementKind = "regular" | "reversal" | "adjustment";

export interface Supplier {
supplierId:number,
  name:string,
  email:string,
  phone:string,
}

export interface StockInput {
    stockInputId: number;
    userId: number | null;
    observation: string | null;
    createdAt: string;
    kind?: MovementKind;
    // Estorno: a saída que esta entrada desfaz.
    reversesOutputId?: number | null;
    // A saída que estornou esta entrada, se houver.
    reversedById?: number | null;
}

export interface InputItem {
    inputItemId: number;
    stockInputId: number;
    productId: number;
    quantity: number;
    unitPrice?: number | null;
    createdAt?: string;
}

export interface StockOutput {
    stockOutputId: number;
    userId: number | null;
    observation: string | null;
    createdAt: string;
    kind?: MovementKind;
    // Estorno: a entrada que esta saída desfaz.
    reversesInputId?: number | null;
    // A entrada que estornou esta saída, se houver.
    reversedById?: number | null;
}

export interface OutputItem {
    outputItemId: number; 
    stockOutputId: number; 
    productId: number;
    quantity: number;
    createdAt?: string;
}


export interface InputItemDetalhado extends InputItem {
    product?: Product | null;
}


export interface StockInputDetalhado extends StockInput {
    supplier?: Supplier;
    items: InputItemDetalhado[];
}


export interface OutputItemDetalhado extends OutputItem {
    product?: Product | null;
}


export interface StockOutputDetalhado extends StockOutput {
    items: OutputItemDetalhado[];
}


export interface ProductDetalhado extends Product {
    category?: Category;
}
