import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginScreen from '../screens/screenLogin/screen/loginScreen';
import HomeScreen from '../screens/ScreenHome/screen/homeScreen';
import { ProductScreen } from '../screens/screenProducts/screen/product';
import { CategoryScreen } from '../screens/screenCategory/screen/category';
import InputScreen from '../screens/screenInputs/screen/inputs';
import OutputScreen from '../screens/screenOutputs/screen/output';
import SupplierScreen from '../screens/screenSupliers/screen/suppliers';
import UserScreen from '../screens/screenUsers/screen/users';
import DashboardScreen from '../screens/screenDashboard/screen/dashboard';
import SignupScreen from '../screens/screenSignup/screen/signupScreen';
import CompanyScreen from '../screens/screenCompany/screen/company';
import ChangePasswordScreen from '../screens/screenChangePassword/screen/changePassword';
import SubscriptionScreen from '../screens/screenSubscription/screen/subscription';
import SimulatedCheckoutScreen from '../screens/screenSubscription/screen/simulatedCheckout';

export default function App() {
  return (
    <>
    {/* Confirmações curtas após salvar; erros continuam nos próprios formulários e modais. */}
    <Toaster position="bottom-right" closeButton duration={3500} toastOptions={{ className: "app-toast" }} />
    <Routes>
      <Route path="/" element={<LoginScreen />} />
      <Route path="/signup" element={<SignupScreen />} />
      <Route path="/trocar-senha" element={<ChangePasswordScreen />} />
      <Route path="/home" element={<HomeScreen />} />
      <Route path="/dashboard" element={<DashboardScreen />} />
      <Route path="/productScreen" element={<ProductScreen />} />
      <Route path="/categoryScreen" element={<CategoryScreen />} />
      <Route path="/inputScreen" element={<InputScreen />} />
      <Route path="/outputScreen" element={<OutputScreen />} />
      <Route path="/supplierScreen" element={<SupplierScreen />} />
      <Route path="/userScreen" element={<UserScreen />} />
      <Route path="/companyScreen" element={<CompanyScreen />} />
      <Route path="/assinatura" element={<SubscriptionScreen />} />
      <Route path="/assinatura/simulada" element={<SimulatedCheckoutScreen />} />

    </Routes>
    </>
  );
}
