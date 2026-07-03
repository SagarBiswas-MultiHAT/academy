import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class PaymentsService {
  constructor(private configService: ConfigService) {}

  async initiatePayment(tranId: string, amount: string, customerName: string, customerEmail: string) {
    const storeId = this.configService.get<string>('AAMARPAY_STORE_ID');
    const signatureKey = this.configService.get<string>('AAMARPAY_SIGNATURE_KEY');
    const baseUrl = this.configService.get<string>('AAMARPAY_BASE_URL');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    const payload = {
      store_id: storeId,
      signature_key: signatureKey,
      tran_id: tranId,
      amount,
      currency: 'BDT',
      desc: 'MultiHAT Academy E-Book Purchase',
      cus_name: customerName,
      cus_email: customerEmail,
      cus_phone: '01700000000',
      success_url: `${frontendUrl}/payment/success?id=${tranId}`,
      fail_url: `${frontendUrl}/payment/fail?id=${tranId}`,
      cancel_url: `${frontendUrl}/payment/cancel?id=${tranId}`,
      type: 'json',
    };

    try {
      const response = await axios.post(`${baseUrl}/jsonpost.php`, payload);
      if (response.data?.payment_url) return { paymentUrl: response.data.payment_url };
      throw new BadRequestException('aamarPay initiation failed');
    } catch (error) {
      throw new BadRequestException(`Payment error: ${error.message}`);
    }
  }

  async searchTransaction(requestId: string) {
    const storeId = this.configService.get<string>('AAMARPAY_STORE_ID');
    const signatureKey = this.configService.get<string>('AAMARPAY_SIGNATURE_KEY');
    const baseUrl = this.configService.get<string>('AAMARPAY_BASE_URL');

    const response = await axios.get(`${baseUrl}/api/v1/trxcheck/request.php`, {
      params: {
        request_id: requestId,
        store_id: storeId,
        signature_key: signatureKey,
        type: 'json',
      },
    });

    return response.data;
  }

  verifyIpnSignature(payload: any): boolean {
    if (!payload?.mer_txnid || !payload?.amount || !payload?.signature) {
      return false;
    }

    const storeId = this.configService.get<string>('AAMARPAY_STORE_ID');
    const signatureKey = this.configService.get<string>('AAMARPAY_SIGNATURE_KEY');
    const raw = `${storeId}${signatureKey}${payload.mer_txnid}${payload.amount}BDT`;
    const computed = crypto.createHash('md5').update(raw).digest('hex');
    const provided = String(payload.signature);

    if (!/^[a-fA-F0-9]{32}$/.test(provided)) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(provided, 'hex'));
  }
}
