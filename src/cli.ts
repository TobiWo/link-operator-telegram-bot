import arg from 'arg';
import { providers } from 'ethers';

export interface CommandLineArgs {
  eligibleChats: string;
  provider: providers.BaseProvider;
}

export class CLI {
  private args: any;

  constructor() {
    this.args = this.getArgs();
  }

  parse(): CommandLineArgs {
    this.printHelp();
    if (!this.args['--eligible-chats']) throw new Error('Missing required argument: --eligible-chats');
    // split string and parse id's to numbers
    const cliArgs: CommandLineArgs = {
      eligibleChats: this.args['--eligible-chats'],
      provider: this.getCorrectProvider(),
    };
    return cliArgs;
  }

  getCorrectProvider(): providers.BaseProvider {
    this.printHelp();
    const url: string = this.args['--url'];
    let generalProvider: providers.BaseProvider;
    if (!url) {
      const infuraProjectSecret: string = this.args['--infura-project-secret'];
      const infuraProjectId: string = this.args['--infura-project-id'];
      if (!infuraProjectId || !infuraProjectSecret)
        throw new Error('Missing required argument: --infura-project-id and/or --infura-project-secret');
      generalProvider = new providers.InfuraProvider('homestead', {
        projectId: infuraProjectId,
        projectSecret: infuraProjectSecret,
      });
    } else if (url.includes('ws')) {
      generalProvider = new providers.WebSocketProvider(url);
    } else if (url.includes('http')) {
      generalProvider = new providers.JsonRpcProvider(url);
    } else {
      throw Error('URL should be undefined, a websocket-connection or a http-connection');
    }
    return generalProvider;
  }

  private getArgs(): any {
    return arg({
      //Types'
      '--eligible-chats': String,
      '--help': Boolean,
      '--infura-project-id': String,
      '--infura-project-secret': String,
      '--url': String,

      // Aliases
      '-e': '--eligible-chats',
      '-h': '--help',
      '-i': '--infura-project-id',
      '-j': '--infura-project-secret',
      '-u': '--url',
    });
  }

  private printHelp() {
    if (this.args['--help']) {
      console.log(`chainlink-node-operator-telegram-bot [args]\n`);
      console.log('options:');
      console.log(
        '-e,--eligible-chats\t\tcomma separated list with chat-ids on which the bot should work\n\t\t\t\tif chat-id startswith "-" do not include it'
      );
      console.log('-u,--url\t\t\tblockchain client connection url (optional)');
      console.log('-i,--infura-project-id\t\tinfura project id (optional if url is set)');
      console.log('-j,--infura-project-secret\tinfura project secret (optional if url is set)');
      console.log('-h,--help\t\t\tprint help');
      process.exit();
    }
  }
}

export const cliOptions = new CLI().parse();
