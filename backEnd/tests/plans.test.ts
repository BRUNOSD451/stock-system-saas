import test from "node:test";
import assert from "node:assert/strict";
import { hasActivePro, resolveAccess } from "../src/config/plans";

const now = new Date("2026-10-22T12:00:00Z");
const yesterday = new Date("2026-10-21T12:00:00Z");
const tomorrow = new Date("2026-10-23T12:00:00Z");

type Company = Parameters<typeof resolveAccess>[0];
const company = (data: Partial<Company>): Company => ({ plan: "free", status: "trial", trialEndsAt: null, currentPeriodEnd: null, ...data });

test("teste dentro do prazo tem acesso completo", () => {
  const access = resolveAccess(company({ trialEndsAt: tomorrow }), now);
  assert.deepEqual(access, { plan: "free", status: "trial", trialExpired: false, periodEnded: false, readOnly: false });
});

test("teste vencido fica somente leitura", () => {
  const access = resolveAccess(company({ trialEndsAt: yesterday }), now);
  assert.equal(access.trialExpired, true);
  assert.equal(access.readOnly, true);
});

test("teste vence exatamente no horário de término", () => {
  assert.equal(resolveAccess(company({ trialEndsAt: now }), now).readOnly, true);
});

test("teste sem data de término não bloqueia", () => {
  assert.equal(resolveAccess(company({}), now).readOnly, false);
});

test("pro dentro do mês pago tem acesso completo mesmo com data de teste antiga", () => {
  const access = resolveAccess(company({ plan: "pro", status: "active", trialEndsAt: yesterday, currentPeriodEnd: tomorrow }), now);
  assert.equal(access.trialExpired, false);
  assert.equal(access.periodEnded, false);
  assert.equal(access.readOnly, false);
  assert.equal(hasActivePro(access), true);
});

test("pro com o mês pago vencido fica somente leitura e pode assinar de novo", () => {
  const access = resolveAccess(company({ plan: "pro", status: "active", currentPeriodEnd: yesterday }), now);
  assert.equal(access.periodEnded, true);
  assert.equal(access.readOnly, true);
  assert.equal(hasActivePro(access), false);
});

test("pro ativo sem data de vencimento não bloqueia", () => {
  const access = resolveAccess(company({ plan: "pro", status: "active" }), now);
  assert.equal(access.readOnly, false);
  assert.equal(hasActivePro(access), true);
});

test("pagamento atrasado, cancelada e suspensa ficam somente leitura", () => {
  for (const status of ["past_due", "canceled", "suspended"]) {
    const access = resolveAccess(company({ plan: "pro", status, currentPeriodEnd: tomorrow }), now);
    assert.equal(access.readOnly, true, status);
    assert.equal(access.trialExpired, false, status);
    assert.equal(hasActivePro(access), false, status);
  }
});

test("datas em texto também são aceitas", () => {
  assert.equal(resolveAccess(company({ trialEndsAt: yesterday.toISOString() }), now).readOnly, true);
  assert.equal(resolveAccess(company({ plan: "pro", status: "active", currentPeriodEnd: yesterday.toISOString() }), now).readOnly, true);
});

test("plano desconhecido cai no free", () => {
  assert.equal(resolveAccess(company({ plan: "enterprise", status: "active" }), now).plan, "free");
  assert.equal(resolveAccess(company({ plan: "toString", status: "active" }), now).plan, "free");
});
