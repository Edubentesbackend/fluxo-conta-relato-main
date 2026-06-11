import { FormEvent, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, LogIn, TrendingUp, BarChart3, Shield, Zap, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: BarChart3, text: "Relatórios e analytics em tempo real" },
  { icon: TrendingUp, text: "Controle de fluxo entre contas" },
  { icon: Shield, text: "Acesso seguro por perfil de usuário" },
  { icon: Zap, text: "Exportações em PDF e Excel" },
];

interface LoginPageProps {
  onShowRegister: () => void;
}

export function LoginPage({ onShowRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const password = passwordInputRef.current?.value ?? "";
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas. Tente novamente.");
    } finally {
      if (passwordInputRef.current) passwordInputRef.current.value = "";
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden">
      {/* ── Left panel (hero) ── */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden gradient-hero">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <BrandLogo variant="wordmark" className="max-w-xs rounded-lg shadow-large" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/60 uppercase tracking-widest">Sistema Financeiro</p>
              <h1 className="text-5xl font-bold leading-tight">
                Controle total<br />das suas finanças
              </h1>
              <p className="text-lg text-white/70 max-w-xs leading-relaxed">
                Gerencie transações entre contas com relatórios inteligentes e analytics avançados.
              </p>
            </div>

            <ul className="space-y-3">
              {features.map((f, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm text-white/80"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <f.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  {f.text}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Fundação Muraki · Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex min-w-0 flex-1 items-center justify-center bg-background p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full min-w-0 max-w-[342px] space-y-8 sm:max-w-md"
        >
          {/* Mobile logo */}
          <BrandLogo
            className="mb-2 lg:hidden"
            imageClassName="h-8 w-8"
            textClassName="text-base text-foreground"
          />

          <div className="space-y-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">Entre com suas credenciais para acessar o sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="h-11 rounded-xl border-2 focus:border-primary"
                placeholder="seu_usuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                name="password"
                ref={passwordInputRef}
                type="password"
                autoComplete="current-password"
                required
                className="h-11 rounded-xl border-2 focus:border-primary"
                placeholder="••••••••"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl gradient-primary text-white font-semibold shadow-medium hover:opacity-90 gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white inline-block" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar no sistema
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Não tem conta?{" "}
              <button
                type="button"
                onClick={onShowRegister}
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Cadastrar-se
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
