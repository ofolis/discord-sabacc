import * as discordJs from "discord.js";
import { PLAYER_MAXIMUM, PLAYER_MINIMUM } from "../constants";
import {
  ChannelCommandMessage,
  ChannelMessage,
  Discord,
  Log,
  Utils,
} from "../core";
import {
  CardSuit,
  CardType,
  DrawSource,
  PlayerStatus,
  TurnAction,
} from "../enums";
import {
  ChannelState,
  HandResult,
  Player,
  PlayerCard,
  Turn,
} from "../saveables";
import { Card } from "../types";

export class InteractionController {
  public static async announceGameEnd(
    channelState: ChannelState,
  ): Promise<void> {
    const embedData: discordJs.EmbedData = {
      description: Utils.linesToString([
        `After ${(channelState.session.handIndex + 1).toString()} hand${channelState.session.handIndex === 0 ? "" : "s"}, the winner is...`,
        `## ${channelState.session.winningPlayer.tagString} 🎉`,
      ]),
      title: "The Game Is Over!",
    };
    if (channelState.session.winningPlayer.avatarUrl !== null) {
      embedData.image = {
        url: channelState.session.winningPlayer.avatarUrl,
      };
    }
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder(embedData),
    ]);
  }

  public static async announceGameStart(
    channelState: ChannelState,
  ): Promise<void> {
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        description: `A ${channelState.session.allPlayers.length.toString()}-player Sabacc game has begun!`,
        fields: [
          {
            inline: true,
            name: "Players",
            value: Utils.linesToString(
              channelState.session.activePlayersInTurnOrder.map(
                player => `- ${player.nameString}`,
              ),
            ),
          },
          {
            inline: true,
            name: "Starting Tokens",
            value: channelState.session.startingTokenTotal.toString(),
          },
        ],
        title: "Game Started",
      }),
    ]);
  }

  public static async announceHandEnd(
    channelState: ChannelState,
  ): Promise<void> {
    const currentHandResult: HandResult =
      channelState.session.getCurrentHandResult();
    const resultsLines: string[] = [];
    const usedPlayerIds: string[] = [];
    currentHandResult.rankings.forEach(ranking => {
      const player: Player = channelState.session.getPlayerById(
        ranking.playerId,
      );
      const tokenDetailStrings: string[] = [];
      if (ranking.tokenLossTotal === 0) {
        tokenDetailStrings.push("Full Refund!");
      } else {
        if (ranking.spentTokenTotal > 0) {
          tokenDetailStrings.push(
            `\`${ranking.spentTokenTotal.toString()}\` Spent`,
          );
        }
        if (ranking.tokenPenaltyTotal > 0) {
          tokenDetailStrings.push(
            `\`${ranking.tokenPenaltyTotal.toString()}\` Penalty`,
          );
        }
      }
      resultsLines.push(
        `- \`#${(ranking.rankIndex + 1).toString()}\` ${player.status !== PlayerStatus.ACTIVE ? `~~**${player.nameString}**~~ 💀` : `**${player.nameString}**`}`,
        `  - Cards: ${this.__formatCardString(ranking.sandCard)} ${this.__formatCardString(ranking.bloodCard)}`,
        `  - Tokens: \`${this.__formatTokenResultString(player.tokenTotal, ranking.tokenLossTotal)}\` `,
        `    -# ${tokenDetailStrings.join(" + ")}`,
      );
      usedPlayerIds.push(ranking.playerId);
    });
    const previouslyEliminatedLines: string[] = [];
    channelState.session.allPlayers.forEach(player => {
      if (!usedPlayerIds.includes(player.id)) {
        previouslyEliminatedLines.push(`~~${player.nameString}~~ 💀`);
      }
    });
    const fields: discordJs.APIEmbedField[] = [
      {
        name: "Results",
        value: Utils.linesToString(resultsLines),
      },
    ];
    if (previouslyEliminatedLines.length > 0) {
      fields.push({
        name: "Previously Eliminated",
        value: Utils.linesToString(previouslyEliminatedLines),
      });
    }
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        description: "Here are the results...",
        fields,
        title: `Ended Hand ${(channelState.session.handIndex + 1).toString()}`,
      }),
    ]);
  }

  public static async announceHandStart(
    channelState: ChannelState,
  ): Promise<void> {
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        title: `Starting Hand ${(channelState.session.handIndex + 1).toString()}`,
      }),
    ]);
  }

  public static async announceRoundStart(
    channelState: ChannelState,
  ): Promise<void> {
    if (channelState.session.roundIndex < 3) {
      await this.__createChannelMessageEmbed(channelState.channelId, [
        new discordJs.EmbedBuilder({
          title: `Starting Round ${(channelState.session.roundIndex + 1).toString()}`,
        }),
      ]);
    } else {
      await this.__createChannelMessageEmbed(channelState.channelId, [
        new discordJs.EmbedBuilder({
          title: "Starting Reveal Round",
        }),
      ]);
    }
  }

  public static async announceTurnDraw(
    channelState: ChannelState,
  ): Promise<void> {
    const player: Player = channelState.session.currentPlayer;
    if (
      player.roundTurn === null ||
      player.roundTurn.action !== TurnAction.DRAW ||
      !player.roundTurn.isResolved
    ) {
      Log.throw(
        "Cannot announce turn draw. Player does not contain a completed draw turn.",
      );
    }
    const turn: Turn = player.roundTurn;
    if (turn.drawnCard === null || turn.discardedCard === null) {
      Log.throw(
        "Cannot announce turn draw. Player turn record did not contain both a drawn and discarded card.",
        { turn },
      );
    }
    let description: string;
    switch (turn.drawnCardSource) {
      case DrawSource.DECK:
        description = `A card was drawn from the \`${this.__formatCardSuitIcon(turn.drawnCard.suit)}\` deck and ${this.__formatCardString(turn.discardedCard)} was discarded.`;
        break;
      case DrawSource.DISCARD:
        description = `${this.__formatCardString(turn.drawnCard)} was drawn from the \`${this.__formatCardSuitIcon(turn.drawnCard.suit)}\` discard and ${this.__formatCardString(turn.discardedCard)} was discarded.`;
        break;
      default:
        Log.throw("Cannot announce turn draw. Unknown drawn card source.", {
          turn,
        });
    }
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        description,
        title: `${player.nameString} Drew A Card`,
      }),
    ]);
  }

  public static async announceTurnReveal(
    channelState: ChannelState,
  ): Promise<void> {
    const player: Player = channelState.session.currentPlayer;
    if (
      player.roundTurn === null ||
      player.roundTurn.action !== TurnAction.REVEAL ||
      !player.roundTurn.isResolved
    ) {
      Log.throw(
        "Cannot announce turn reveal. Player does not contain a completed reveal turn.",
      );
    }
    const bloodCards: readonly PlayerCard[] = player.getCards(CardSuit.BLOOD);
    const sandCards: readonly PlayerCard[] = player.getCards(CardSuit.SAND);
    if (bloodCards.length !== 1 || sandCards.length !== 1) {
      Log.throw(
        "Cannot announce turn reveal. Player does not contain exactly one card of each suit.",
        { bloodCards, sandCards },
      );
    }
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        description: Utils.linesToString([
          "Here are their final cards...",
          `# ${this.__formatCardString(sandCards[0])} ${this.__formatCardString(bloodCards[0])}`,
        ]),
        title: `${player.nameString} Completed Their Hand`,
      }),
    ]);
  }

  public static async announceTurnStand(
    channelState: ChannelState,
  ): Promise<void> {
    const player: Player = channelState.session.currentPlayer;
    if (
      player.roundTurn === null ||
      player.roundTurn.action !== TurnAction.STAND ||
      !player.roundTurn.isResolved
    ) {
      Log.throw(
        "Cannot announce turn stand. Player does not contain a completed stand turn.",
      );
    }
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        description: "No card was drawn or discarded.",
        title: `${player.nameString} Stood`,
      }),
    ]);
  }

  public static async announceTurnStart(
    channelState: ChannelState,
  ): Promise<void> {
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        description: `${channelState.session.currentPlayer.tagString} use the **/play** command to take your turn.`,
        title: `${channelState.session.currentPlayer.nameString}'s Turn`,
      }),
    ]);
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
    await this.__setChannelMessageEmbed(message, [
      new discordJs.EmbedBuilder({
        description: Utils.linesToString(contentLines),
        title: "No Game",
      }),
    ]);
  }

  public static async informNotPlaying(message: ChannelMessage): Promise<void> {
    await this.__setChannelMessageEmbed(message, [
      new discordJs.EmbedBuilder({
        description: "You are not playing in the current game.",
        title: "Not Playing",
      }),
    ]);
  }

  public static async informNotTurn(
    message: ChannelMessage,
    channelState: ChannelState,
  ): Promise<void> {
    await this.__setChannelMessageEmbed(message, [
      new discordJs.EmbedBuilder({
        description: `It is currently ${channelState.session.currentPlayer.nameString}'s turn.`,
        title: "Not Your Turn",
      }),
    ]);
  }

  public static async informPlayerInfo(
    message: ChannelMessage,
    channelState: ChannelState,
    playerId: string,
  ): Promise<void> {
    const player: Player = channelState.session.getPlayerById(playerId);
    await this.__setChannelMessageEmbed(message, [
      new discordJs.EmbedBuilder({
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
        ],
      }),
      new discordJs.EmbedBuilder({
        fields: [
          {
            inline: true,
            name: "Cards",
            value: this.__formatPlayerCardsString(player),
          },
          {
            inline: true,
            name: "Tokens",
            value: this.__formatTokenStateString(
              player.availableTokenTotal,
              player.spentTokenTotal,
            ),
          },
        ],
        title: "Your Items",
      }),
    ]);
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
      [
        new discordJs.EmbedBuilder({
          description: "Choose the die roll value.",
          title: "Die Roll Selection",
        }),
      ],
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
      [
        new discordJs.EmbedBuilder({
          description: "Choose the card to keep.",
          title: "Discard",
        }),
      ],
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
      [
        new discordJs.EmbedBuilder({
          description: "Choose what you would like to draw.",
          title: "Draw Selection",
        }),
      ],
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
      [
        new discordJs.EmbedBuilder({
          description: "Choose your turn action.",
          title: "Turn Action",
        }),
      ],
      [
        new discordJs.ButtonBuilder({
          customId: "draw",
          label: "Draw",
          style: discordJs.ButtonStyle.Primary,
          disabled: player.availableTokenTotal === 0,
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
      [
        new discordJs.EmbedBuilder({
          description:
            "Do you want to end the current game and start a new one?",
          title: "Game In Progress",
        }),
      ],
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
      const embed: discordJs.EmbedBuilder = new discordJs.EmbedBuilder({
        description: "JOIN!",
        fields: [
          {
            name: "Players",
            value: [message.user, ...userAccumulator]
              .map(user => Discord.formatUserNameString(user))
              .join(","),
          },
        ],
        title: "JOIN",
      });
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
          [embed],
          buttons,
        );
      } else {
        await this.__setChannelMessageEmbed(channelMessage, [embed], buttons);
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
            `The game was started by ${Discord.formatUserNameString(buttonInteraction.user)}!`,
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
      [
        new discordJs.EmbedBuilder({
          description: "Do you want to reveal your cards and end your hand?",
          title: "Reveal Cards",
        }),
      ],
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
      [
        new discordJs.EmbedBuilder({
          description: `Roll the dice for ${this.__formatCardString(playerCard)}?`,
          title: "Roll Dice",
        }),
      ],
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
    embeds: discordJs.EmbedBuilder[],
    buttons?: discordJs.ButtonBuilder[],
  ): Promise<ChannelMessage> {
    return await Discord.sendChannelMessage(
      channelId,
      this.__createEmbedBaseMessageOptions(embeds, buttons),
    );
  }

  private static __createEmbedBaseMessageOptions(
    embeds: discordJs.EmbedBuilder[],
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
      embeds: embeds.length > 0 ? embeds : undefined,
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

  private static __formatPlayerCardsString(player: Player): string {
    const bloodCards: readonly PlayerCard[] = player.getCards(CardSuit.BLOOD);
    const sandCards: readonly PlayerCard[] = player.getCards(CardSuit.SAND);
    const bloodCardStrings: string[] = bloodCards.map(card =>
      this.__formatCardString(card),
    );
    const sandCardStrings: string[] = sandCards.map(card =>
      this.__formatCardString(card),
    );
    return [...sandCardStrings, ...bloodCardStrings].join(" ");
  }

  private static __formatTokenResultString(
    tokenTotal: number,
    tokenLossTotal: number,
  ): string {
    if (tokenTotal + tokenLossTotal === 0) {
      return "`None`";
    }
    const tokenTotalString: string = "⚪".repeat(tokenTotal);
    const tokenLossString: string = "🔴".repeat(tokenLossTotal);
    return `\`${tokenTotalString}${tokenLossString}\``;
  }

  private static __formatTokenStateString(
    availableTokenTotal: number,
    spentTokenTotal: number,
  ): string {
    if (availableTokenTotal + spentTokenTotal === 0) {
      return "`None`";
    }
    const availableTokenString: string = "⚪".repeat(availableTokenTotal);
    const spentTokenString: string = "⚫".repeat(spentTokenTotal);
    return `\`${availableTokenString}${spentTokenString}\``;
  }

  private static async __setChannelMessageEmbed(
    message: ChannelMessage,
    embeds: discordJs.EmbedBuilder[],
    buttons?: discordJs.ButtonBuilder[],
  ): Promise<void> {
    await message.update(this.__createEmbedBaseMessageOptions(embeds, buttons));
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
