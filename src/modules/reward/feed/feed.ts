import * as wizardText from '../../../../resources/wizard.json';
import { BillingSet, FeedRewardStatus } from '../../../model/feed_reward_status';
import { Markup, Scenes } from 'telegraf';
import { BigNumber } from 'ethers';

export class FeedWizard<T extends BigNumber | BillingSet> {
  protected currentFeedStatus: Map<string, FeedRewardStatus<T>> = new Map();

  async replyWithListeningConfirmationButton(
    selectStepAfterReply: number,
    ctx: Scenes.WizardContext
  ): Promise<Scenes.WizardContextWizard<Scenes.WizardContext<Scenes.WizardSessionData>>> {
    await ctx.replyWithMarkdownV2(
      wizardText.listening_service.replies.activation_note,
      Markup.inlineKeyboard([
        Markup.button.callback(wizardText.listening_service.button.start, wizardText.listening_service.action.start),
        Markup.button.callback(wizardText.listening_service.button.stop, wizardText.listening_service.action.stop),
      ])
    );
    return ctx.wizard.selectStep(selectStepAfterReply);
  }
}
