import * as botText from '../resources/bot.json';
import { Context, Markup } from 'telegraf';

export class Replier {
  /**
   * Replies the bots module menu.
   *
   * @param ctx conversation context
   */
  static async replyBotMainMenu(ctx: Context): Promise<void> {
    await ctx.replyWithMarkdownV2(
      botText.messages.choose_module,
      Markup.keyboard([
        [botText.module_names.total_reward],
        [botText.module_names.flux_details, botText.module_names.ocr_details],
      ])
        .oneTime()
        .resize()
    );
  }
}
