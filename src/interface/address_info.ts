export interface AddressInfo {
  link_token_contract: string;
  flux: Addresses;
  ocr: OcrAddresses;
}

export interface OcrAddresses extends Addresses {
  payee: string;
}

interface Addresses {
  oracle: string;
  contracts: string[];
}
