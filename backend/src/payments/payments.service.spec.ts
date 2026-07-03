import axios from 'axios';
import * as crypto from 'crypto';

import { PaymentsService } from './payments.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaymentsService', () => {
  const config = {
    get: jest.fn((key: string) => ({
      AAMARPAY_STORE_ID: 'store',
      AAMARPAY_SIGNATURE_KEY: 'sig',
      AAMARPAY_BASE_URL: 'https://sandbox.aamarpay.com',
      FRONTEND_URL: 'http://localhost:3000',
    })[key]),
  } as any;

  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(config);
  });

  it('verifies valid IPN signatures', () => {
    const payload = { mer_txnid: 'TXN-1', amount: '100' };
    const signature = crypto.createHash('md5').update('storesigTXN-1100BDT').digest('hex');

    expect(service.verifyIpnSignature({ ...payload, signature })).toBe(true);
    expect(service.verifyIpnSignature({ ...payload, signature: 'bad' })).toBe(false);
    expect(service.verifyIpnSignature({ amount: '100', signature })).toBe(false);
  });

  it('initiates an aamarPay payment and returns the payment URL', async () => {
    mockedAxios.post.mockResolvedValue({ data: { payment_url: 'https://pay.example/checkout' } });

    await expect(service.initiatePayment('TXN-1', '100', 'Buyer', 'buyer@example.com')).resolves.toEqual({
      paymentUrl: 'https://pay.example/checkout',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://sandbox.aamarpay.com/jsonpost.php',
      expect.objectContaining({
        tran_id: 'TXN-1',
        amount: '100',
        success_url: 'http://localhost:3000/payment/success?id=TXN-1',
      }),
    );
  });

  it('searches a transaction by request id', async () => {
    mockedAxios.get.mockResolvedValue({ data: { pay_status: 'Successful' } });

    await expect(service.searchTransaction('TOPUP-1')).resolves.toEqual({ pay_status: 'Successful' });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://sandbox.aamarpay.com/api/v1/trxcheck/request.php',
      { params: expect.objectContaining({ request_id: 'TOPUP-1', store_id: 'store' }) },
    );
  });
});
