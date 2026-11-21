export const STATUSES = [
  { value: 'orcamento', label: 'Orçamento', color: '#64748b' },
  { value: 'aprovado', label: 'Aprovado', color: '#3b82f6' },
  { value: 'producao', label: 'Em produção', color: '#f59e0b' },
  { value: 'acabamento', label: 'Acabamento', color: '#8b5cf6' },
  { value: 'pronto', label: 'Pronto', color: '#10b981' },
  { value: 'entregue', label: 'Entregue', color: '#0f766e' },
];

export const PRIORITIES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

export const PRODUCT_TYPES = [
  'Cartão de visita',
  'Flyer',
  'Folder',
  'Banner',
  'Adesivo',
  'Etiqueta',
  'Rótulo',
  'Cardápio',
  'Convite',
  'Papelaria',
  'Embalagem',
  'Placa',
  'Camiseta',
  'Comunicação visual',
  'Outro',
];

export const statusInfo = (value) => STATUSES.find((s) => s.value === value) ?? STATUSES[0];
export const priorityLabel = (value) => PRIORITIES.find((p) => p.value === value)?.label ?? value;
