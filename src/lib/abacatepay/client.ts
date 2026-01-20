/**
 * Cliente para API AbacatePay
 * Documentação: https://docs.abacatepay.com
 */

const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY;
const ABACATEPAY_BASE_URL = process.env.ABACATEPAY_BASE_URL || 'https://api.abacatepay.com/v1';

// ========================================
// TYPES
// ========================================

export interface Customer {
  name: string;
  cellphone: string; // Telefone com DDD (apenas números)
  email: string;
  taxId: string; // CPF (apenas números)
}

export interface CreatePixRequest {
  amount: number; // Valor em centavos
  expiresIn: number; // Tempo de expiração em segundos
  description: string;
  customer?: Customer;
  metadata?: {
    userId?: string;
    eventId?: string;
    amount?: number;
  };
}

export interface AbacatePixData {
  id: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

export interface AbacateResponse<T> {
  data: T;
  error: string | null;
}

export interface CheckPixData {
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
}

// ========================================
// CLIENT
// ========================================

class AbacatePayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!ABACATEPAY_API_KEY) {
      throw new Error('ABACATEPAY_API_KEY não configurada');
    }
    this.apiKey = ABACATEPAY_API_KEY;
    this.baseUrl = ABACATEPAY_BASE_URL;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: object
  ): Promise<AbacateResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    try {
      console.log('[AbacatePay] Fazendo requisição:', { method, endpoint });
      const response = await fetch(url, options);
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('[AbacatePay] Erro ao parsear JSON:', jsonError);
        return {
          data: null as unknown as T,
          error: `Resposta inválida da API (${response.status})`,
        };
      }

      if (!response.ok) {
        console.error('[AbacatePay] Erro na requisição:', {
          status: response.status,
          statusText: response.statusText,
          data: JSON.stringify(data),
        });
        return {
          data: null as unknown as T,
          error: data.error || data.message || data.detail || `HTTP ${response.status}`,
        };
      }

      console.log('[AbacatePay] Requisição bem sucedida');
      return data as AbacateResponse<T>;
    } catch (error) {
      console.error('[AbacatePay] Erro de rede:', error);
      return {
        data: null as unknown as T,
        error: error instanceof Error ? error.message : 'Erro de conexão',
      };
    }
  }

  /**
   * Cria uma cobrança PIX
   */
  async createPix(params: CreatePixRequest): Promise<AbacateResponse<AbacatePixData>> {
    return this.request<AbacatePixData>('POST', '/pixQrCode/create', params);
  }

  /**
   * Verifica o status de uma cobrança PIX
   */
  async checkPix(pixId: string): Promise<AbacateResponse<CheckPixData>> {
    return this.request<CheckPixData>('GET', `/pixQrCode/check?id=${pixId}`);
  }
}

// Singleton instance
let clientInstance: AbacatePayClient | null = null;

export function getAbacatePayClient(): AbacatePayClient {
  if (!clientInstance) {
    clientInstance = new AbacatePayClient();
  }
  return clientInstance;
}

// Helper para verificar se a API está configurada
export function isAbacatePayConfigured(): boolean {
  return !!ABACATEPAY_API_KEY;
}



