import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { getRedisClient } from "../../database/redis";
import { AppError } from "../../utils/errors";

const MESSAGE_LIMIT = 5;
const memoryKey = (userId: number) => `stock-system:chat:user:${userId}:messages`;

export async function loadChatMemory(userId: number): Promise<BaseMessage[]> {
  try {
    const redis = await getRedisClient();
    const entries = await redis.lrange<string>(memoryKey(userId), -MESSAGE_LIMIT, -1);
    return entries.map(entry => {
      const message = JSON.parse(entry);
      if (typeof message.content !== "string" || !["user", "assistant"].includes(message.role)) {
        throw new Error("Invalid chat memory");
      }
      return message.role === "user" ? new HumanMessage(message.content) : new AIMessage(message.content);
    });
  } catch {
    throw new AppError("Não foi possível carregar a memória do chat. Verifique o Redis.", 503);
  }
}

export async function saveChatExchange(userId: number, message: string, reply: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    // Append and trim atomically so concurrent requests cannot exceed the limit.
    await redis.multi()
      .rpush(memoryKey(userId),
        JSON.stringify({ role: "user", content: message }),
        JSON.stringify({ role: "assistant", content: reply }),
      )
      .ltrim(memoryKey(userId), -MESSAGE_LIMIT, -1)
      .exec();
  } catch {
    throw new AppError("Não foi possível salvar a memória do chat. Verifique o Redis.", 503);
  }
}
