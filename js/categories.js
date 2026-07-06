// Fixed category and payment-method catalogs used across the app.
const EXPENSE_CATEGORIES = [
  { id: 'moradia', label: 'Moradia', icon: '🏠', color: '#4C6FFF' },
  { id: 'alimentacao', label: 'Alimentação', icon: '🍔', color: '#FF6B6B' },
  { id: 'transporte', label: 'Transporte', icon: '🚗', color: '#FFA94D' },
  { id: 'lazer', label: 'Lazer', icon: '🎬', color: '#FFD43B' },
  { id: 'saude', label: 'Saúde', icon: '💊', color: '#63E6BE' },
  { id: 'outros', label: 'Outros', icon: '📦', color: '#ADB5BD' },
];

const INCOME_CATEGORIES = [
  { id: 'salario', label: 'Salário', icon: '💼', color: '#1DAA55' },
  { id: 'freelance', label: 'Freelance', icon: '💻', color: '#4C6FFF' },
  { id: 'investimentos', label: 'Investimentos', icon: '📈', color: '#845EF7' },
  { id: 'outros_receita', label: 'Outros', icon: '📥', color: '#ADB5BD' },
];

const PAYMENT_METHODS = ['Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Pix', 'Transferência'];

function findCategory(type, id) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.id === id) || list[list.length - 1];
}
