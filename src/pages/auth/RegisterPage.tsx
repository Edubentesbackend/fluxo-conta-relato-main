import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, TrendingUp, BarChart3, Shield, Zap, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: BarChart3, text: "Relatórios e analytics em tempo real" },
  { icon: TrendingUp, text: "Controle de fluxo entre contas" },
  { icon: Shield, text: "Acesso seguro por perfil de usuário" },
  { icon: Zap, text: "Exportações em PDF e Excel" },
];

interface RegisterPageProps {
  onBack: () => void;
}

export function RegisterPage({ onBack }: RegisterPageProps) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = (): string => {
    if (form.name.trim().length < 2) return "Nome deve ter ao menos 2 caracteres.";
    if (!/^[a-zA-Z0-9_]{3,}$/.test(form.username))
      return "Usuário deve ter ao menos 3 caracteres (letras, números e _).";
    if (!form.email.includes("@")) return "E-mail inválido.";
    if (form.password.length < 8) return "Senha deve ter ao menos 8 caracteres.";
    if (form.password !== form.confirmPassword) return "As senhas não coincidem.";
    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await register(form);
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (hero) ── */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden gradient-hero">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">FluxoFinanceiro</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/60 uppercase tracking-widest">Sistema Financeiro</p>
              <h1 className="text-5xl font-bold leading-tight">
                Crie sua<br />conta agora
              </h1>
              <p className="text-lg text-white/70 max-w-xs leading-relaxed">
                Após o cadastro, um administrador irá liberar suas permissões de acesso.
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
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-hero">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gradient-hero">FluxoFinanceiro</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Criar conta</h2>
            <p className="text-sm text-muted-foreground">Preencha os dados para se cadastrar no sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
              <Input
                id="name"
                type="text"
                value={form.name}
                onChange={set("name")}
                autoComplete="name"
                required
                className="h-11 rounded-xl border-2 focus:border-primary"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-username" className="text-sm font-medium">Usuário</Label>
              <Input
                id="reg-username"
                type="text"
                value={form.username}
                onChange={set("username")}
                autoComplete="username"
                required
                className="h-11 rounded-xl border-2 focus:border-primary"
                placeholder="seu_usuario"
              />
              <p className="text-xs text-muted-foreground">Apenas letras, números e underscore (_)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                required
                className="h-11 rounded-xl border-2 focus:border-primary"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  required
                  className="h-11 rounded-xl border-2 focus:border-primary pr-10"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-confirm" className="text-sm font-medium">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="reg-confirm"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  autoComplete="new-password"
                  required
                  className="h-11 rounded-xl border-2 focus:border-primary pr-10"
                  placeholder="Repita a senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Criar conta
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
