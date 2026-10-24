import { randomInt } from "crypto";

// Sem caracteres ambíguos (0/O, 1/l/I), porque a senha é lida e digitada por uma pessoa.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Senha provisória no formato xxxx-xxxx, gerada com aleatoriedade criptográfica.
export function generateTemporaryPassword() {
  const pick = () => ALPHABET[randomInt(ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `${block()}-${block()}`;
}
