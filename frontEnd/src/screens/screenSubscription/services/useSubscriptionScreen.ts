import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { BillingOverview } from "../../../resources/types/types";
import { BillingService } from "../../../services/billingService";
import { saveCompanyData } from "../../../services/getUserData";
import { getErrorMessage } from "../../../services/screenUtils";

export type SubscriptionSituation = "active" | "periodEnded" | "trial" | "trialExpired" | "pastDue" | "inactive";

function situationOf({ company }: BillingOverview): SubscriptionSituation {
  if (company.plan === "pro" && company.status === "active") return company.periodEnded ? "periodEnded" : "active";
  if (company.trialExpired) return "trialExpired";
  if (company.status === "trial") return "trial";
  if (company.status === "past_due") return "pastDue";
  return "inactive";
}

// Carrega a situação da assinatura e inicia o checkout; a tela só apresenta.
export function useSubscriptionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const justSubscribed = (location.state as { justSubscribed?: boolean } | null)?.justSubscribed === true;

  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    BillingService.getOverview()
      .then((loaded) => {
        if (!active) return;
        setOverview(loaded);
        setLoadError("");
        // Mantém o aviso de modo consulta da barra lateral igual à situação real.
        saveCompanyData(loaded.company);
      })
      .catch((error: unknown) => { if (active) setLoadError(getErrorMessage(error, "Não foi possível carregar a assinatura.")); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const subscribe = async () => {
    setIsStarting(true);
    setActionError("");
    try {
      const { checkoutUrl } = await BillingService.createCheckout();
      // Checkout simulado é uma rota do próprio app; o do gateway é um endereço externo.
      if (checkoutUrl.startsWith("/")) navigate(checkoutUrl);
      else window.location.assign(checkoutUrl);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Não foi possível iniciar a assinatura."));
      setIsStarting(false);
    }
  };

  const retry = () => { setIsLoading(true); setLoadError(""); setAttempt((value) => value + 1); };

  const trialEndsAt = overview?.company.trialEndsAt ?? null;
  const trialDaysLeft = overview && situationOf(overview) === "trial" && trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return {
    overview, situation: overview ? situationOf(overview) : null, trialDaysLeft, justSubscribed,
    isLoading, loadError, isStarting, actionError, subscribe, retry,
  };
}
