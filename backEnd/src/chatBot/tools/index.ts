import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { AppError } from "../../utils/errors";
import {
  type ChatTool, type ToolContext,
  searchProducts, getProductById, getLowStockProducts, getOutOfStockProducts,
  stockCountTool, getStockValue,
  getCategories, getSuppliers, getSupplierById, getUserById,
  getStockInputs, getStockOutputs, getProductsOfStockInput, getProductsOfStockOutput,
  getProductMovements, getMovementSummary, getMostWithdrawnProducts,
  previewStockMovement, createStockInput, createStockOutput,
} from "./tools";

// Registre novas ferramentas aqui: cada uma tem declaração e execução.
const tools: ChatTool[] = [
  searchProducts,
  getProductById,
  getLowStockProducts,
  getOutOfStockProducts,
  stockCountTool,
  getStockValue,
  getCategories,
  getSuppliers,
  getSupplierById,
  getUserById,
  getStockInputs,
  getStockOutputs,
  getProductsOfStockInput,
  getProductsOfStockOutput,
  getProductMovements,
  getMovementSummary,
  getMostWithdrawnProducts,
  previewStockMovement,
  createStockInput,
  createStockOutput,
];

const writeTools = new Set([createStockInput.declaration.name, createStockOutput.declaration.name]);

export const toolDeclarations = tools.map(tool => tool.declaration);

export const chatTools = tools.map(item => new DynamicStructuredTool({
  name: item.declaration.name,
  description: item.declaration.description,
  schema: z.fromJSONSchema((item.declaration.parameters
    ?? { type: "object", properties: {}, additionalProperties: false }) as Parameters<typeof z.fromJSONSchema>[0]),
  func: async (args, _runManager, config) => {
    const context: ToolContext = {
      userId: Number(config?.configurable?.userId),
      companyId: Number(config?.configurable?.companyId),
      turn: Number(config?.configurable?.turn),
    };
    return JSON.stringify(await executeTool(item.declaration.name, args, context) ?? null);
  },
}));

export async function executeTool(name: string, args: unknown = {}, context?: ToolContext) {
  const tool = tools.find(item => item.declaration.name === name);
  if (!tool) return { error: "Ferramenta não disponível." };
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { error: "Argumentos inválidos." };
  }
  // Sem empresa válida nenhuma consulta é feita: evita cair em dados de outro cliente.
  if (!context || !Number.isSafeInteger(context.companyId) || context.companyId <= 0) {
    return { error: "Não foi possível identificar a empresa do usuário." };
  }
  try {
    return await tool.execute(args as Record<string, unknown>, context);
  } catch (error) {
    // Erros de negócio (estoque insuficiente, não encontrado, filtro inválido) vão ao modelo para ele explicar ou corrigir.
    if (error instanceof AppError) return { error: error.message };
    // Não expõe SQL nem trata falha de consulta como estoque zerado.
    console.error(`Falha na ferramenta do chat ${name}:`, error);
    return writeTools.has(name)
      ? { error: "Não foi possível concluir o registro e nada foi alterado. Informe a falha ao usuário." }
      : { error: "Não foi possível consultar o estoque. Informe a indisponibilidade ao usuário, sem inventar valores." };
  }
}
