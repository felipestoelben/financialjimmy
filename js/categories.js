// Fixed category and payment-method catalogs used across the app.
const EXPENSE_CATEGORIES = [
  { id: 'moradia', label: 'Moradia', icon: '🏠', color: '#4C6FFF' },
  { id: 'alimentacao', label: 'Alimentação', icon: '🍔', color: '#FF6B6B' },
  { id: 'transporte', label: 'Transporte', icon: '🚗', color: '#FFA94D' },
  { id: 'lazer', label: 'Lazer', icon: '🎬', color: '#FFD43B' },
  { id: 'saude', label: 'Saúde', icon: '💊', color: '#63E6BE' },
  { id: 'assinaturas', label: 'Assinaturas', icon: '📱', color: '#20C997' },
  { id: 'outros', label: 'Outros', icon: '📦', color: '#ADB5BD' },
];

const INCOME_CATEGORIES = [
  { id: 'salario', label: 'Salário', icon: '💼', color: '#1DAA55' },
  { id: 'freelance', label: 'Freelance', icon: '💻', color: '#4C6FFF' },
  { id: 'investimentos', label: 'Investimentos', icon: '📈', color: '#845EF7' },
  { id: 'outros_receita', label: 'Outros', icon: '📥', color: '#ADB5BD' },
];

const INVESTMENT_CATEGORIES = [
  { id: 'renda_fixa', label: 'Renda fixa', icon: '🏦', color: '#4C6FFF' },
  { id: 'acoes', label: 'Ações', icon: '📊', color: '#845EF7' },
  { id: 'fundos_imobiliarios', label: 'Fundos imobiliários', icon: '🏢', color: '#20C997' },
  { id: 'criptomoedas', label: 'Criptomoedas', icon: '🪙', color: '#FFA94D' },
  { id: 'poupanca', label: 'Poupança', icon: '🐷', color: '#63E6BE' },
  { id: 'outros_investimento', label: 'Outros', icon: '📥', color: '#ADB5BD' },
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
