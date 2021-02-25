import { utils, BigNumber } from 'ethers';

export class Helper {
  static getLinkValueWithTwoDecimals(linkInWei: BigNumber): string {
    const valueString: string = utils.formatEther(linkInWei);
    return valueString.slice(0, valueString.indexOf('.') + 3);
  }
}
