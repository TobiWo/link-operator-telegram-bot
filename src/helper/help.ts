import '../prototype/string.extensions';
import { BigNumber, providers, utils } from 'ethers';
import { ConnectionInfo } from '../cli';

export class Helper {
  static parseLinkWeiToLink(linkInWei: BigNumber, decimals: number): string {
    const valueString: string = utils.formatEther(linkInWei);
    return valueString.slice(0, valueString.indexOf('.') + decimals + 1);
  }

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
