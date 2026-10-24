import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BillingOverview } from "../../../resources/types/types";
import { BillingService } from "../../../services/billingService";
import { saveCompanyData } from "../../../services/getUserData";
import { getErrorMessage } from "../../../services/screenUtils";

// Imita a página de pagamento do gateway: confirmar equivale ao pagamento aprovado.
export function useSimulatedCheckout() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    BillingService.getOverview()
      .then((loaded) => { if (active) setOverview(loaded); })
      .catch((requestError: unknown) => { if (active) setError(getErrorMessage(requestError, "Não foi possível carregar o pagamento.")); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const confirm = async () => {
    setIsConfirming(true);
    setError("");
    try {
      const company = await BillingService.confirmSimulated();
      saveCompanyData(company);
      navigate("/assinatura", { replace: true, state: { justSubscribed: true } });
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Não foi possível confirmar o pagamento."));
      setIsConfirming(false);
    }
  };

  const cancel = () => navigate("/assinatura", { replace: true });

  return { overview, isLoading, isConfirming, error, confirm, cancel };
}
