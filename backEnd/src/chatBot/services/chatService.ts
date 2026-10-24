import "dotenv/config";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { AppError } from "../../utils/errors";
import { primaryPrompt } from "../prompts/primaryPrompt";
import { chatTools } from "../tools";
import { loadChatMemory, saveChatExchange } from "./chatMemory";
import { nextChatTurn } from "./pendingMovement";

export async function generateChatReply(message: string, userId: number, companyId: number): Promise<string> {

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new AppError("Configure OPENROUTER_API_KEY no backend.", 503);

  const signal = AbortSignal.timeout(60000);
  try {
    const model = new ChatOpenRouter({
      apiKey,
      model: process.env.OPENROUTER_MODEL?.trim() || "inclusionai/ling-3.0-flash-fin:free",
      maxRetries: 0,
      siteName: "Stock System",
      provider: { require_parameters: true },
    });



    const modelWithTools = model.bindTools(chatTools);
    const history = await loadChatMemory(userId);
    // Turno desta mensagem: registros pelo chat só executam prévias de turnos anteriores.
    const turn = await nextChatTurn(userId);
    const messages: BaseMessage[] = [new SystemMessage(primaryPrompt), ...history, new HumanMessage(message)];


    
    for (let round = 0; round < 4; round++) {
      signal.throwIfAborted();
      const reply = await modelWithTools.invoke(messages, {
        signal,
        tool_choice: round === 3 ? "none" : "auto",
      });
      if (reply.invalid_tool_calls?.length) {
        throw new AppError("A IA retornou uma consulta inválida. Tente novamente.", 502);
      }
      const calls = reply.tool_calls ?? [];
      if (calls.length) {
        if (round === 3 || calls.length > 8) {
          throw new AppError("Limite de consultas da IA atingido. Tente uma pergunta mais específica.", 502);
        }
        messages.push(reply);
        for (const call of calls) {
          signal.throwIfAborted();
          if (!call.id) throw new AppError("A IA retornou uma consulta inválida. Tente novamente.", 502);
          const selectedTool = chatTools.find(tool => tool.name === call.name);
          let content: string;
          if (!selectedTool) {
            content = JSON.stringify({ error: "Ferramenta não disponível." });
          } else {
            try {
              content = await selectedTool.invoke(call.args, { signal, configurable: { userId, companyId, turn } });
            } catch {
              signal.throwIfAborted();
              content = JSON.stringify({ error: "Argumentos inválidos para a consulta. Corrija conforme o schema da ferramenta." });
            }
          }
          messages.push(new ToolMessage({ content, tool_call_id: call.id, name: call.name }));
        }
        continue;
      }
      const text = typeof reply.content === "string" ? reply.content : reply.content
        .filter(block => block.type === "text" && typeof block.text === "string")
        .map(block => block.text).join("\n");
      if (!text.trim()) throw new AppError("A IA não retornou uma resposta. Tente novamente.", 502);
      await saveChatExchange(userId, message, text);
      return text;
    }
    



    throw new AppError("A IA não concluiu a resposta. Tente novamente.", 502);



  } catch (error) {





    if (error instanceof AppError) throw error;
    if (signal.aborted) throw new AppError("O OpenRouter demorou para responder. Tente novamente.", 504);
    const failure = error as { statusCode?: number; status?: number };
    const status = failure?.statusCode ?? failure?.status;
    if (status === 429) throw new AppError("Limite de uso do OpenRouter atingido. Tente novamente mais tarde.", 429);
    if (status === 401 || status === 403) throw new AppError("O OpenRouter recusou o acesso. Verifique OPENROUTER_API_KEY no backend.", 502);
    if (status === 402) throw new AppError("O OpenRouter informou saldo insuficiente. Verifique sua conta e o modelo configurado.", 502);
    if (status) throw new AppError("Não foi possível consultar o OpenRouter. Verifique a disponibilidade do modelo e o suporte a ferramentas.", 502);
    throw new AppError("Falha ao conectar ao OpenRouter. Verifique a rede e tente novamente.", 502);



  }
}
