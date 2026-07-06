// Fixed category and payment-method catalogs used across the app.
const EXPENSE_CATEGORIES = [
  { id: 'moradia', label: 'Moradia', icon: '🏠', color: '#3D5A99' },
  { id: 'alimentacao', label: 'Alimentação', icon: '🍔', color: '#C9584B' },
  { id: 'transporte', label: 'Transporte', icon: '🚗', color: '#C48A3D' },
  { id: 'lazer', label: 'Lazer', icon: '🎬', color: '#B8912F' },
  { id: 'saude', label: 'Saúde', icon: '💊', color: '#3F9E7B' },
  { id: 'assinaturas', label: 'Assinaturas', icon: '📱', color: '#2F8F6E' },
  { id: 'outros', label: 'Outros', icon: '📦', color: '#9C9690' },
];

const INCOME_CATEGORIES = [
  { id: 'salario', label: 'Salário', icon: '💼', color: '#12A150' },
  { id: 'freelance', label: 'Freelance', icon: '💻', color: '#3D5A99' },
  { id: 'investimentos', label: 'Investimentos', icon: '📈', color: '#6D28D9' },
  { id: 'outros_receita', label: 'Outros', icon: '📥', color: '#9C9690' },
];

const INVESTMENT_CATEGORIES = [
  { id: 'renda_fixa', label: 'Renda fixa', icon: '🏦', color: '#3D5A99' },
  { id: 'acoes', label: 'Ações', icon: '📊', color: '#6D28D9' },
  { id: 'fundos_imobiliarios', label: 'Fundos imobiliários', icon: '🏢', color: '#2F8F6E' },
  { id: 'criptomoedas', label: 'Criptomoedas', icon: '🪙', color: '#C48A3D' },
  { id: 'poupanca', label: 'Poupança', icon: '🐷', color: '#3F9E7B' },
  { id: 'outros_investimento', label: 'Outros', icon: '📥', color: '#9C9690' },
];

const PAYMENT_METHODS = ['Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Pix', 'Transferência'];

function categoriesForType(type) {
  if (type === 'income') return INCOME_CATEGORIES;
  if (type === 'investment') return INVESTMENT_CATEGORIES;
  return EXPENSE_CATEGORIES;
}

function findCategory(type, id) {
  const list = categoriesForType(type);
  return list.find((c) => c.id === id) || list[list.length - 1];
}
