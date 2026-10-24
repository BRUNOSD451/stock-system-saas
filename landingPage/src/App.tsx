import Header from "./components/Header";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Capabilities from "./components/Capabilities";
import Steps from "./components/Steps";
import Pricing from "./components/Pricing";
import Faq from "./components/Faq";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo">
        <Hero />
        <Features />
        <Capabilities />
        <Steps />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
