import { utils, BigNumber } from 'ethers';

export class Helper {
  static getLinkValueWithDefinedDecimals(linkInWei: BigNumber, decimals: number): string {
    const valueString: string = utils.formatEther(linkInWei);
    return valueString.slice(0, valueString.indexOf('.') + decimals + 1);
  }
}
