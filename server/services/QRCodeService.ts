import QRCode from 'qrcode';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class QRCodeService {
  private static readonly QR_CODE_DIR = './qrcodes';
  private static readonly BASE_QR_URL = 'https://www.acaisublime.com.br/fidelidade?phone=';

  /**
   * Gera QR Code para identificação do cliente
   */
  static async generateQRCode(phone: string): Promise<string> {
    try {
      // Criar diretório se não existir
      await mkdir(this.QR_CODE_DIR, { recursive: true });
      
      // Gerar URL do QR Code
      const qrUrl = `${this.BASE_QR_URL}${encodeURIComponent(phone)}`;
      
      // Gerar QR Code como data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      // Salvar arquivo também
      const fileName = `${phone.replace(/\D/g, '')}.png`;
      const filePath = join(this.QR_CODE_DIR, fileName);
      await QRCode.toFile(filePath, qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      return qrCodeDataURL;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw new Error(`Falha ao gerar QR Code: ${error.message}`);
    }
  }

  /**
   * Gera QR Code em formato de arquivo
   */
  static async generateQRCodeFile(phone: string): Promise<string> {
    try {
      await mkdir(this.QR_CODE_DIR, { recursive: true });
      
      const qrUrl = `${this.BASE_QR_URL}${encodeURIComponent(phone)}`;
      const fileName = `${phone.replace(/\D/g, '')}.png`;
      const filePath = join(this.QR_CODE_DIR, fileName);
      
      await QRCode.toFile(filePath, qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      return filePath;
    } catch (error) {
      console.error('Erro ao gerar QR Code arquivo:', error);
      throw new Error(`Falha ao gerar QR Code arquivo: ${error.message}`);
    }
  }

  /**
   * Gera QR Code para múltiplos clientes
   */
  static async generateBulkQRCodes(customers: Array<{phone: string, id: number}>): Promise<Array<{phone: string, qrCode: string}>> {
    const results = [];
    
    for (const customer of customers) {
      try {
        const qrCode = await this.generateQRCode(customer.phone);
        results.push({
          phone: customer.phone,
          qrCode
        });
        
        // Pausa para evitar sobrecarregar o sistema
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erro ao gerar QR Code para ${customer.phone}:`, error);
        results.push({
          phone: customer.phone,
          qrCode: null
        });
      }
    }
    
    return results;
  }

  /**
   * Valida formato do telefone
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Formata telefone para padrão brasileiro
   */
  static formatPhone(phone: string): string {
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '');
    
    // Adiciona parênteses e hífen conforme formato brasileiro
    if (numbers.length === 11) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    } else if (numbers.length === 10) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
    }
    
    return phone; // Retorna original se não conseguir formatar
  }

  /**
   * Extrai números do telefone
   */
  static extractNumbers(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Converte telefone brasileiro para formato internacional
   */
  static toInternationalFormat(phone: string): string {
    const numbers = this.extractNumbers(phone);
    if (numbers.startsWith('55') && numbers.length === 13) {
      return `+${numbers}`;
    } else if (numbers.length === 11) {
      return `+55${numbers}`;
    }
    return phone;
  }
}