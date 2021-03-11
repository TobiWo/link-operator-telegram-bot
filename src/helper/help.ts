import '../prototype/string.extensions';
import { BigNumber, providers, utils } from 'ethers';
import { ConnectionInfo } from '../cli';

export class Helper {
  /**
   * Parses LinkWei to Link.
   * Caveat: No rounding up/down in this method. It cuts off hard at the defined decimal place.
   *
   * @param linkInWei
   * @param decimals number of decimals for the returned string
   * @returns floating point LINK value
   */
  static parseLinkWeiToLink(linkInWei: BigNumber, decimals: number): string {
    const valueString: string = utils.formatEther(linkInWei);
    return valueString.slice(0, valueString.indexOf('.') + decimals + 1);
  }

  /**
   * Parses the supplied connection info object to the corresponding provider.
   * This will be a InfuraProvider, JsonRpcProvider or WebsocketProvider
   *
   * @param connectionInfo object with blockchain connection info
   * @return provider depending on the supplied blockchain connection info
   */
  static parseConnectionInfoToProvider(connectionInfo: ConnectionInfo): providers.BaseProvider {
    let generalProvider: providers.BaseProvider;
    if (!connectionInfo.url) {
      generalProvider = new providers.InfuraProvider('homestead', {
        projectId: connectionInfo.infuraId,
        projectSecret: connectionInfo.infuraSecret,
      });
    } else if (connectionInfo.url.includes('ws')) {
      generalProvider = new providers.WebSocketProvider(connectionInfo.url);
    } else {
      generalProvider = new providers.JsonRpcProvider(connectionInfo.url);
    }
    return generalProvider;
  }
}
