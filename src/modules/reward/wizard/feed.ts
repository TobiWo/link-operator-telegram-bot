import * as wizardText from '../../../../resources/wizard.json';
import { BillingSet, FeedRewardStatus } from '../../../model/feed_reward_status';
import { Markup, Scenes } from 'telegraf';
import { BigNumber } from 'ethers';

export class FeedWizard<T extends BigNumber | BillingSet> {
  protected currentFeedStatus: Map<string, FeedRewardStatus<T>> = new Map();

  protected getFeedStatus(feedName: string): FeedRewardStatus<T> {
    const feedStatus: FeedRewardStatus<T> | undefined = this.currentFeedStatus.get(feedName);
    if (feedStatus) return feedStatus;
    throw Error(`FeedNotPresentError: No feed with name ${feedName} tracked!`);
  }

  async startListeningConfirmationRequest(
    selectStep: number,
    ctx: Scenes.WizardContext
  ): Promise<Scenes.WizardContextWizard<Scenes.WizardContext<Scenes.WizardSessionData>>> {
    await ctx.replyWithMarkdownV2(
      wizardText.listening_service.replies.activation_note,
      Markup.inlineKeyboard([
        Markup.button.callback(wizardText.listening_service.button.start, wizardText.listening_service.action.start),
        Markup.button.callback(wizardText.listening_service.button.stop, wizardText.listening_service.action.stop),
      ])
    );
    return ctx.wizard.selectStep(selectStep);
  }

  // getStartListeningConfirmationStep(
  //   feedRewardListeningStep: FeedRewardListeningType,
  //   help: string
  // ): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
  //   const stepHandler = new Composer<Scenes.WizardContext>();
  //   stepHandler.action(wizardText.listening_service.action.start, async (ctx) => {
  //     feedRewardListeningStep(this.currentFeedStatus, ctx);
  //     return ctx.wizard.selectStep(0);
  //   });
  //   stepHandler.action(wizardText.listening_service.action.stop, async (ctx) => {
  //     ctx.reply(help);
  //     return ctx.wizard.selectStep(0);
  //   });
  //   return stepHandler;
  // }
}

// type FeedRewardListeningType = <T extends BigNumber | BillingSet>(
//   currentFeedStatus: Map<string, FeedRewardStatus<T>>,
//   ctx: Scenes.WizardContext
// ) => Promise<void>;
