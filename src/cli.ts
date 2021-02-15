import * as cliText from '../resources/cli.json';
import arg from 'arg';
import { providers } from 'ethers';

export interface CommandLineArgs {
  chatbotToken: string;
  eligibleChats: number[];
  provider: providers.BaseProvider;
}

export class CLI {
  private args: any;

  constructor() {
    this.args = this.getArgs();
  }

  parse(): CommandLineArgs {
    this.printHelp();
    const cliArgs: CommandLineArgs = {
      chatbotToken: this.getChatbotToken(),
      eligibleChats: this.getEligibleChats(),
      provider: this.getCorrectProvider(),
    };
    return cliArgs;
  }

  private getEligibleChats(): number[] {
    if (!this.args[cliText.long.eligible_chats])
      throw new Error(`${cliText.errors.missing_arg} ${cliText.long.eligible_chats}`);
    const eligibleChatsString: string = this.args[cliText.long.eligible_chats];
    return eligibleChatsString.split(',').map((chatId) => parseInt(chatId));
  }

  private getChatbotToken(): string {
    this.printHelp();
    if (!this.args[cliText.long.bot_token]) throw new Error(`${cliText.errors.missing_arg} ${cliText.long.bot_token}`);
    return this.args[cliText.long.bot_token];
  }

  private getCorrectProvider(): providers.BaseProvider {
    this.printHelp();
    const url: string = this.args[cliText.long.url];
    let generalProvider: providers.BaseProvider;
    if (!url) {
      const infuraProjectSecret: string = this.args[cliText.long.infura_project_secret];
      const infuraProjectId: string = this.args[cliText.long.infura_project_id];
      if (!infuraProjectId || !infuraProjectSecret)
        throw new Error(
          `${cliText.errors.missing_arg} ${cliText.long.infura_project_id} and/or ${cliText.long.infura_project_secret}`
        );
      generalProvider = new providers.InfuraProvider('homestead', {
        projectId: infuraProjectId,
        projectSecret: infuraProjectSecret,
      });
    } else if (url.includes('ws')) {
      generalProvider = new providers.WebSocketProvider(url);
    } else if (url.includes('http')) {
      generalProvider = new providers.JsonRpcProvider(url);
    } else {
      throw Error(cliText.errors.url);
    }
    return generalProvider;
  }

  private getArgs(): any {
    return arg({
      //Types'
      '--bot-token': String,
      '--eligible-chats': String,
      '--help': Boolean,
      '--infura-project-id': String,
      '--infura-project-secret': String,
      '--url': String,

      // Aliases
      '-b': '--bot-token',
      '-e': '--eligible-chats',
      '-h': '--help',
      '-i': '--infura-project-id',
      '-j': '--infura-project-secret',
      '-u': '--url',
    });
  }

  private printHelp() {
    if (this.args[cliText.long.help]) {
      console.log(`${cliText.help.explainer}\n`);
      console.log(cliText.help.options);
      console.log(`${cliText.short.bot_token},${cliText.long.bot_token}\t\t\t${cliText.help.descriptions.bot_token}`);
      console.log(
        `${cliText.short.eligible_chats},${cliText.long.eligible_chats}\t\t${cliText.help.descriptions.eligible_chats}`
      );
      console.log(`${cliText.short.url},${cliText.long.url}\t\t\t${cliText.help.descriptions.url}`);
      console.log(
        `${cliText.short.infura_project_id},${cliText.long.infura_project_id}\t\t${cliText.help.descriptions.infura_project_id}`
      );
      console.log(
        `${cliText.short.infura_project_secret},${cliText.long.infura_project_secret}\t${cliText.help.descriptions.infura_project_secret}`
      );
      console.log(`${cliText.short.help},${cliText.long.help}\t\t\t${cliText.help.descriptions.help}`);
      process.exit();
    }
  }
}

export const cliOptions = new CLI().parse();
