import arg from 'arg';

export class CLI {
  private args: any;

  constructor() {
    this.args = this.getArgs();
  }

  parse(): void {
    if (this.args['--help']) {
      this.printHelp();
      process.exit();
    }
  }

  private getArgs(): any {
    return arg({
      //Types'
      '--help': Boolean,

      // Aliases
      '-h': '--help',
    });
  }

  private printHelp() {
    console.log(`chainlink-bot [args]\n`);
    console.log('options:');
    console.log('\t-h,--help\t\t show help');
  }
}

export const cliOptions = new CLI().parse();
