/** Formatação e validação de CPF / telefone (Brasil) para cadastro e perfil */

export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

export function isValidCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i], 10) * (10 - i);
  }
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  if (digit1 !== parseInt(numbers[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i], 10) * (11 - i);
  }
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  if (digit2 !== parseInt(numbers[10], 10)) return false;

  return true;
}

export function formatPhoneBR(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

/** DDD + número (10 ou 11 dígitos), removendo 55 internacional quando aplicável */
export function getBrazilPhoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let n = phone.replace(/\D/g, '');
  if (n.startsWith('55') && n.length >= 12) n = n.slice(2);
  if (n.length < 10 || n.length > 11) return null;
  return n;
}

export function isValidPhoneBR(phone: string): boolean {
  return getBrazilPhoneDigits(phone) !== null;
}

/** Formato esperado em APIs de pagamento (ex.: AbacatePay) */
export function formatBrazilPhoneForAbacate(digits: string): string {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
}

/** CPF formatado XXX.XXX.XXX-XX a partir do valor salvo no perfil */
export function formatCPFForTaxId(cpf: string): string {
  const numbers = cpf.replace(/\D/g, '');
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

export function hasFullLegalName(name: string): boolean {
  return name.trim().split(/\s+/).filter(Boolean).length >= 2;
}
