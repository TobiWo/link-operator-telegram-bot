export interface AddressInfo {
  link_token_contract: string;
  flux: Addresses;
  ocr: OcrAddresses;
}

interface OcrAddresses extends Addresses {
  payee: string;
}

interface Addresses {
  oracle: string;
  contracts: ContractInfo[];
}

export interface ContractInfo {
  address: string;
  name: string;
}
