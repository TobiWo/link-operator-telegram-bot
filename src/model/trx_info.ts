import { providers } from 'ethers';

export interface TrxInfo {
  transactionResponse: providers.TransactionResponse;
  transactionReceipt: providers.TransactionReceipt;
}
