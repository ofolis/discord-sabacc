import * as discordJs from "discord.js";
import { PLAYER_MAXIMUM, PLAYER_MINIMUM } from "../constants";
import {
  ChannelCommandMessage,
  ChannelMessage,
  Discord,
  Log,
  Utils,
} from "../core";
import { CardSuit, CardType, DrawSource, TurnAction } from "../enums";
import { ChannelState, Player, PlayerCard } from "../saveables";
import { Card } from "../types";

export class InteractionController {
  public static async announceGameEnd(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: "The game has ended.",
    });
  }

  public static async announceGameStart(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: "The game has started.",
    });
  }

  public static async announceHandEnd(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: "The hand has ended.",
    });
  }

  public static async announceHandStart(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: "A new hand has started.",
    });
  }

  public static async announceRoundStart(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: "A new round has started.",
    });
  }

  public static async announceTurnDraw(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: "Draw action occurred.",
    });
  }

  public static async announceTurnReveal(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: "Reveal action occurred.",
    });
  }

  public static async announceTurnStand(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: "Stand action occurred.",
    });
  }

  public static async announceTurnStart(
    channelState: ChannelState,
  ): Promise<void> {
    await Discord.sendChannelMessage(channelState.channelId, {
      content: `${this.__formatPlayerNameString(channelState.session.currentPlayer)}'s turn has started.`,
    });
  }

  public static async followupGameCreated(
    message: ChannelMessage,
  ): Promise<void> {
    await this.__setChannelMessageFollowup(message, "You created a new game.");
  }

  public static async followupGameEnded(
    message: ChannelMessage,
  ): Promise<void> {
    await this.__setChannelMessageFollowup(
      message,
      "The previous game was ended.",
    );
  }

  public static async followupGameNotEnded(
    message: ChannelMessage,
  ): Promise<void> {
    await this.__setChannelMessageFollowup(
      message,
      "The current game was not ended.",
    );
  }

  public static async followupTurnComplete(
    message: ChannelMessage,
  ): Promise<void> {
    await this.__setChannelMessageFollowup(message, "Your turn is complete.");
  }

  public static async followupTurnIncomplete(
    message: ChannelMessage,
  ): Promise<void> {
    await this.__setChannelMessageFollowup(message, "Your turn is incomplete.");
  }

  public static async informNoGame(message: ChannelMessage): Promise<void> {
    const contentLines: string[] = [
      "There is no game currently active in this channel.",
      "-# Use the **/new** command to start a new game.",
    ];
    await this.__setChannelMessageEmbed(message, {
      description: Utils.linesToString(contentLines),
      title: "No Game",
    });
  }

  public static async informNotPlaying(message: ChannelMessage): Promise<void> {
    await this.__setChannelMessageEmbed(message, {
      description: "You are not playing in the current game.",
      title: "Not Playing",
    });
  }

  public static async informNotTurn(
    message: ChannelMessage,
    channelState: ChannelState,
  ): Promise<void> {
    await this.__setChannelMessageEmbed(message, {
      description: `It is currently ${this.__formatPlayerNameString(channelState.session.currentPlayer)}'s turn.`,
      title: "Not Your Turn",
    });
  }

  public static async informPlayerInfo(
    message: ChannelMessage,
    channelState: ChannelState,
    playerId: string,
  ): Promise<void> {
    const player: Player = channelState.session.getPlayerById(playerId);
    await this.__setChannelMessageEmbed(message, {
      fields: [
        {
          inline: true,
          name: "Hand",
          value: (channelState.session.handIndex + 1).toString(),
        },
        {
          inline: true,
          name: "Round",
          value: (channelState.session.roundIndex + 1).toString(),
        },
        {
          inline: false,
          name: "Player ID",
          value: player.id,
        },
      ],
    });
  }

  public static async promptChooseDieRoll(
    message: ChannelMessage,
    playerCard: PlayerCard,
  ): Promise<number | null> {
    if (playerCard.dieRolls.length !== 2) {
      Log.throw(
        "Could not resolve choose die roll prompt. There are not exactly 2 die rolls on the player card.",
        { playerCard },
      );
    }
    await this.__setChannelMessageEmbed(
      message,
      {
        description: "Choose the die roll value.",
        title: "Die Roll Selection",
      },
      [
        new discordJs.ButtonBuilder({
          customId: "firstDie",
          label: playerCard.dieRolls[0].toString(),
          style: discordJs.ButtonStyle.Primary,
        }),
        new discordJs.ButtonBuilder({
          customId: "secondDie",
          label: playerCard.dieRolls[1].toString(),
          style: discordJs.ButtonStyle.Primary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(
        message,
        "Die roll selection timed out.",
      );
      return null;
    }
    switch (buttonInteraction.customId) {
      case "firstDie":
        return playerCard.dieRolls[0];
      case "secondDie":
        return playerCard.dieRolls[1];
      default:
        Log.throw(
          "Could not resolve choose die roll prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptChooseDiscardedCard(
    message: ChannelMessage,
    channelState: ChannelState,
  ): Promise<PlayerCard | null> {
    const discardOptions: [PlayerCard, PlayerCard] =
      channelState.session.getDiscardOptionsForCurrentPlayer();
    await this.__setChannelMessageEmbed(
      message,
      {
        description: "Choose the card to keep.",
        title: "Discard",
      },
      [
        new discordJs.ButtonBuilder({
          customId: "firstCard",
          label: this.__formatCardString(discardOptions[0], false),
          style: discordJs.ButtonStyle.Primary,
        }),
        new discordJs.ButtonBuilder({
          customId: "secondCard",
          label: this.__formatCardString(discardOptions[1], false),
          style: discordJs.ButtonStyle.Primary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(
        message,
        "Discard card selection timed out.",
      );
      return null;
    }
    switch (buttonInteraction.customId) {
      case "firstCard":
        return discardOptions[1];
      case "secondCard":
        return discardOptions[0];
      default:
        Log.throw(
          "Could not resolve choose discard card prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptChooseDrawDeck(
    message: ChannelMessage,
    channelState: ChannelState,
  ): Promise<[CardSuit, DrawSource] | null> {
    const buttonBuilders: discordJs.ButtonBuilder[] = [
      new discordJs.ButtonBuilder({
        customId: "sandDeck",
        label: "🟨 ?",
        style: discordJs.ButtonStyle.Primary,
      }),
      new discordJs.ButtonBuilder({
        customId: "bloodDeck",
        label: "🟥 ?",
        style: discordJs.ButtonStyle.Primary,
      }),
    ];
    const topBloodDiscardCard: Card | null =
      channelState.session.getTopDiscardCard(CardSuit.BLOOD);
    if (topBloodDiscardCard !== null) {
      buttonBuilders.push(
        new discordJs.ButtonBuilder({
          customId: "bloodDiscard",
          label: this.__formatCardString(topBloodDiscardCard, false),
          style: discordJs.ButtonStyle.Primary,
        }),
      );
    }
    const topSandDiscardCard: Card | null =
      channelState.session.getTopDiscardCard(CardSuit.SAND);
    if (topSandDiscardCard !== null) {
      buttonBuilders.unshift(
        new discordJs.ButtonBuilder({
          customId: "sandDiscard",
          label: this.__formatCardString(topSandDiscardCard, false),
          style: discordJs.ButtonStyle.Primary,
        }),
      );
    }
    await this.__setChannelMessageEmbed(
      message,
      {
        description: "Choose what you would like to draw.",
        title: "Draw Selection",
      },
      buttonBuilders,
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(
        message,
        "Turn action selection timed out.",
      );
      return null;
    }
    switch (buttonInteraction.customId) {
      case "bloodDeck":
        return [CardSuit.BLOOD, DrawSource.DECK];
      case "bloodDiscard":
        return [CardSuit.BLOOD, DrawSource.DISCARD];
      case "sandDeck":
        return [CardSuit.SAND, DrawSource.DECK];
      case "sandDiscard":
        return [CardSuit.SAND, DrawSource.DISCARD];
      default:
        Log.throw(
          "Could not resolve choose draw deck prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptChooseTurnAction(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<TurnAction | null> {
    const player: Player = channelState.session.getPlayerById(message.user.id);
    await this.__setChannelMessageEmbed(
      message,
      {
        description: "Choose your turn action.",
        title: "Turn Action",
      },
      [
        new discordJs.ButtonBuilder({
          customId: "draw",
          label: "Draw",
          style: discordJs.ButtonStyle.Primary,
          disabled: player.currentTokenTotal === 0,
        }),
        new discordJs.ButtonBuilder({
          customId: "stand",
          label: "Stand",
          style: discordJs.ButtonStyle.Primary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(
        message,
        "Turn action selection timed out.",
      );
      return null;
    }
    switch (buttonInteraction.customId) {
      case "draw":
        return TurnAction.DRAW;
      case "stand":
        return TurnAction.STAND;
      default:
        Log.throw(
          "Could not resolve choose turn action prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptEndCurrentGame(
    message: ChannelMessage,
  ): Promise<boolean | null> {
    await this.__setChannelMessageEmbed(
      message,
      {
        description: "Do you want to end the current game and start a new one?",
        title: "Game In Progress",
      },
      [
        new discordJs.ButtonBuilder({
          customId: "endGame",
          label: "End Current Game",
          style: discordJs.ButtonStyle.Danger,
        }),
        new discordJs.ButtonBuilder({
          customId: "cancel",
          label: "Cancel",
          style: discordJs.ButtonStyle.Secondary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(
        message,
        "New game creation timed out.",
      );
      return null;
    }
    switch (buttonInteraction.customId) {
      case "endGame":
        return true;
      case "cancel":
        return false;
      default:
        Log.throw(
          "Could not resolve end current game prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptJoinGame(
    message: ChannelCommandMessage,
  ): Promise<discordJs.User[] | null> {
    let channelMessage: ChannelMessage | null = null;
    const userAccumulator: discordJs.User[] = [];
    while (userAccumulator.length + 1 < PLAYER_MAXIMUM) {
      const embedData: discordJs.EmbedData = {
        description: "JOIN!",
        fields: [
          {
            name: "Players",
            value: [message.user, ...userAccumulator]
              .map(user => this.__formatPlayerNameString(user))
              .join(","),
          },
        ],
        title: "JOIN",
      };
      const buttons: discordJs.ButtonBuilder[] = [
        new discordJs.ButtonBuilder({
          customId: "join",
          label: "Join Game",
          style: discordJs.ButtonStyle.Primary,
        }),
        new discordJs.ButtonBuilder({
          customId: "start",
          disabled: userAccumulator.length + 1 < PLAYER_MINIMUM,
          label: "Start Game",
          style: discordJs.ButtonStyle.Success,
        }),
      ];
      if (channelMessage === null) {
        channelMessage = await this.__createChannelMessageEmbed(
          message.channelId,
          embedData,
          buttons,
        );
      } else {
        await this.__setChannelMessageEmbed(channelMessage, embedData, buttons);
      }
      const buttonInteraction: discordJs.ButtonInteraction | null =
        await channelMessage.awaitButtonInteraction();
      if (buttonInteraction === null) {
        await this.__setChannelMessageFollowup(
          channelMessage,
          "Game setup timed out.",
        );
        return null;
      }
      switch (buttonInteraction.customId) {
        case "join":
          if (
            buttonInteraction.user.id !== message.user.id &&
            !userAccumulator.some(user => user.id === buttonInteraction.user.id)
          ) {
            userAccumulator.push(buttonInteraction.user);
          }
          continue;
        case "start":
          await this.__setChannelMessageFollowup(
            channelMessage,
            `The game was started by ${this.__formatPlayerNameString(buttonInteraction.user)}!`,
          );
          return userAccumulator;
        default:
          Log.throw(
            "Could not resolve game setup prompt. Unknown button interaction custom ID.",
            {
              buttonInteraction,
            },
          );
      }
    }
    if (channelMessage === null) {
      Log.throw(
        "Cannot conclude game setup prompt. Channel interaction was never set.",
      );
    }
    await this.__setChannelMessageFollowup(
      channelMessage,
      `${PLAYER_MAXIMUM.toString()} players have joined. The game has started!`,
    );
    return userAccumulator;
  }

  public static async promptRevealCards(
    message: ChannelMessage,
  ): Promise<boolean | null> {
    await this.__setChannelMessageEmbed(
      message,
      {
        description: "Do you want to reveal your cards and end your hand?",
        title: "Reveal Cards",
      },
      [
        new discordJs.ButtonBuilder({
          customId: "reveal",
          label: "Reveal Cards",
          style: discordJs.ButtonStyle.Primary,
        }),
        new discordJs.ButtonBuilder({
          customId: "cancel",
          label: "Cancel",
          style: discordJs.ButtonStyle.Secondary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(message, "Card reveal timed out.");
      return null;
    }
    switch (buttonInteraction.customId) {
      case "reveal":
        return true;
      case "cancel":
        return false;
      default:
        Log.throw(
          "Could not resolve reveal cards prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptRollDice(
    message: ChannelMessage,
    playerCard: PlayerCard,
  ): Promise<boolean | null> {
    await this.__setChannelMessageEmbed(
      message,
      {
        description: `Roll the dice for ${this.__formatCardString(playerCard)}?`,
        title: "Roll Dice",
      },
      [
        new discordJs.ButtonBuilder({
          customId: "roll",
          label: "Roll Dice",
          style: discordJs.ButtonStyle.Primary,
        }),
        new discordJs.ButtonBuilder({
          customId: "cancel",
          label: "Cancel",
          style: discordJs.ButtonStyle.Secondary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(message, "Dice roll timed out.");
      return null;
    }
    switch (buttonInteraction.customId) {
      case "roll":
        return true;
      case "cancel":
        return false;
      default:
        Log.throw(
          "Could not resolve roll dice prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  private static async __createChannelMessageEmbed(
    channelId: string,
    embedData: discordJs.EmbedData,
    buttons?: discordJs.ButtonBuilder[],
  ): Promise<ChannelMessage> {
    return await Discord.sendChannelMessage(
      channelId,
      this.__createEmbedBaseMessageOptions(embedData, buttons),
    );
  }

  private static __createEmbedBaseMessageOptions(
    embedData: discordJs.EmbedData,
    buttons?: discordJs.ButtonBuilder[],
  ): discordJs.BaseMessageOptions {
    const components: discordJs.ActionRowBuilder<discordJs.ButtonBuilder>[] =
      buttons !== undefined && buttons.length > 0
        ? [
            new discordJs.ActionRowBuilder<discordJs.ButtonBuilder>({
              components: buttons,
            }),
          ]
        : [];
    return {
      embeds: [new discordJs.EmbedBuilder(embedData)],
      components: components.length > 0 ? components : undefined,
    };
  }

  private static __formatCardString(
    card: Card | PlayerCard,
    includeCodeQuotes: boolean = true,
  ): string {
    const playerCard: PlayerCard | null = "card" in card ? card : null;
    const actualCard: Card = "card" in card ? card.card : card;
    const suitIcon: string = this.__formatCardSuitIcon(actualCard.suit);
    let typeLabel: string;
    switch (actualCard.type) {
      case CardType.IMPOSTER:
        typeLabel = "Imposter";
        break;
      case CardType.NUMBER:
        typeLabel = actualCard.value.toString();
        break;
      case CardType.SYLOP:
        typeLabel = "Sylop";
        break;
      default:
        Log.throw("Cannot format card string. Unknown card type.", actualCard);
    }
    if (
      playerCard !== null &&
      actualCard.type === CardType.IMPOSTER &&
      playerCard.dieRolls.length === 1
    ) {
      typeLabel = `${playerCard.dieRolls[0].toString()} (${typeLabel})`;
    }
    return includeCodeQuotes
      ? `\`${suitIcon}${typeLabel}\``
      : `${suitIcon}${typeLabel}`;
  }

  private static __formatCardSuitIcon(cardSuit: CardSuit): string {
    switch (cardSuit) {
      case CardSuit.BLOOD:
        return "🟥";
      case CardSuit.SAND:
        return "🟨";
      default:
        Log.throw("Cannot format card suit icon. Unknown card suit.", {
          cardSuit,
        });
    }
  }

  private static __formatPlayerNameString(
    playerOrUser: Player | discordJs.User,
  ): string {
    return (playerOrUser.globalName ?? playerOrUser.username).toUpperCase();
  }

  private static async __setChannelMessageEmbed(
    message: ChannelMessage,
    embedData: discordJs.EmbedData,
    buttons?: discordJs.ButtonBuilder[],
  ): Promise<void> {
    await message.update(
      this.__createEmbedBaseMessageOptions(embedData, buttons),
    );
  }

  private static async __setChannelMessageFollowup(
    message: ChannelMessage,
    content: string,
  ): Promise<void> {
    await message.update({
      embeds: [], // Clear any embed
      components: [], // Clear any buttons
      content: `*${content}*`,
    });
  }
}
