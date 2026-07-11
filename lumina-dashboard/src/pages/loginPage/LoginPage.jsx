import LoginModal from "./components/loginModal";
import LanguageSwitcher from "../../components/LanguageSwitcher";

function LoginPage() {
  return (
    <div className="min-h-screen bg-violet-600/50 flex items-center justify-center relative">
      {/* Language switcher — canto superior direito, para usuários não-logados */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher compact />
      </div>
      <LoginModal />
    </div>
  );
}

export default LoginPage;
