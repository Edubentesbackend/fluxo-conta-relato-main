// Utility functions for currency formatting
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCurrencyInput = (value: string): string => {
  // Remove tudo exceto dígitos
  const digits = value.replace(/\D/g, '');
  
  // Se não tem dígitos, retorna vazio
  if (!digits) return '';
  
  // Converte para centavos e depois para reais
  const number = parseInt(digits) / 100;
  
  // Formata com separadores brasileiros
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

export const parseCurrencyInput = (value: string): number => {
  // Remove tudo exceto dígitos
  const digits = value.replace(/\D/g, '');
  
  // Se não tem dígitos, retorna 0
  if (!digits) return 0;
  
  // Converte centavos para reais
  return parseInt(digits) / 100;
};