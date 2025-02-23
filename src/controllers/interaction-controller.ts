import * as discordJs from "discord.js";
import { PLAYER_MAXIMUM, PLAYER_MINIMUM } from "../constants";
import * as colors from "../constants/colors";
import * as icons from "../constants/icons";
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
import { Card, RankedPlayerScorable } from "../types";

export class InteractionController {
  public static async announceGameEnd(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing game end.");
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        color: colors.WHITE,
        description: Utils.linesToString([
          "# The Game Is Over!",
          `After ${(channelState.session.handIndex + 1).toString()} hand${channelState.session.handIndex === 0 ? "" : "s"}, the winner is...`,
          `## ${channelState.session.winningPlayer.tagString} 🎉`,
        ]),
        image:
          channelState.session.winningPlayer.avatarUrl !== null
            ? {
                url: channelState.session.winningPlayer.avatarUrl,
              }
            : undefined,
      }),
    ]);
  }

  public static async announceGameStart(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing game start.");
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        color: colors.WHITE,
        description: Utils.linesToString([
          "# Game Started",
          `A ${channelState.session.allPlayers.length.toString()}-player Sabacc game has begun!`,
        ]),
        fields: [
          {
            inline: true,
            name: "Players",
            value: this.__formatTablePlayersString(channelState),
          },
          {
            inline: true,
            name: "Starting Tokens",
            value: channelState.session.startingTokenTotal.toString(),
          },
        ],
      }),
    ]);
  }

  public static async announceHandEnd(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing hand end.");
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        color: colors.GRAY,
        description: Utils.linesToString([
          `## ${icons.NEW_HAND} Ended Hand ${(channelState.session.handIndex + 1).toString()}`,
          "Here are the results...",
        ]),
        fields: [
          {
            name: "Results",
            value: this.__formatHandResultsString(channelState),
          },
        ],
      }),
    ]);
  }

  public static async announceHandStart(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing hand start.");
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        color: colors.GRAY,
        description: Utils.linesToString([
          `## ${icons.NEW_ROUND} Starting Hand ${(channelState.session.handIndex + 1).toString()}`,
          `${channelState.session.activePlayersInTurnOrder[0].nameString} is now the first player.`,
        ]),
      }),
    ]);
  }

  public static async announceRoundStart(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing round start.");
    if (channelState.session.roundIndex < 3) {
      await this.__createChannelMessageEmbed(channelState.channelId, [
        new discordJs.EmbedBuilder({
          color: colors.GRAY,
          description: `## ${icons.NEW_ROUND} Starting Round ${(channelState.session.roundIndex + 1).toString()}`,
        }),
      ]);
    } else {
      await this.__createChannelMessageEmbed(channelState.channelId, [
        new discordJs.EmbedBuilder({
          color: colors.GRAY,
          description: `## ${icons.NEW_ROUND} Starting Reveal Round`,
        }),
      ]);
    }
  }

  public static async announceTurnDraw(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing turn draw.");
    const turn: Turn | null = channelState.session.currentPlayer.roundTurn;
    if (
      turn === null ||
      turn.action !== TurnAction.DRAW ||
      turn.drawnCard === null ||
      turn.discardedCard === null
    ) {
      Log.throw(
        "Cannot announce turn draw. Player does not contain a completed draw turn.",
      );
    }
    const descriptionLines: string[] = [
      `### ${channelState.session.currentPlayer.nameString} Drew A Card`,
    ];
    switch (turn.drawnCardSource) {
      case DrawSource.DECK:
        descriptionLines.push(
          `A card was drawn from the \`${this.__formatCardSuitIcon(turn.drawnCard.suit)}\` deck and ${this.__formatCardString(turn.discardedCard)} was discarded.`,
        );
        break;
      case DrawSource.DISCARD:
        descriptionLines.push(
          `${this.__formatCardString(turn.drawnCard)} was drawn from the \`${this.__formatCardSuitIcon(turn.drawnCard.suit)}\` discard and ${this.__formatCardString(turn.discardedCard)} was discarded.`,
        );
        break;
      default:
        Log.throw("Cannot announce turn draw. Unknown drawn card source.", {
          turn,
        });
    }
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        color: colors.BLACK,
        description: Utils.linesToString(descriptionLines),
      }),
    ]);
  }

  public static async announceTurnReveal(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing turn reveal.");
    const bloodCards: readonly PlayerCard[] =
      channelState.session.currentPlayer.getCards(CardSuit.BLOOD);
    const sandCards: readonly PlayerCard[] =
      channelState.session.currentPlayer.getCards(CardSuit.SAND);
    if (bloodCards.length !== 1 || sandCards.length !== 1) {
      Log.throw(
        "Cannot announce turn reveal. Player does not contain exactly one card of each suit.",
        { bloodCards, sandCards },
      );
    }
    const descriptionLines: string[] = [
      `### ${channelState.session.currentPlayer.nameString} Completed Their Hand`,
      "Here are their final cards...",
      `# ${this.__formatCardString(sandCards[0])} ${this.__formatCardString(bloodCards[0])}`,
    ];
    const cardPairNameString: string | null = this.__formatCardPairNameString(
      bloodCards[0],
      sandCards[0],
    );
    if (cardPairNameString !== null) {
      descriptionLines.push(`## ${cardPairNameString}`);
    }
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        color: cardPairNameString !== null ? colors.WHITE : colors.BLACK,
        description: Utils.linesToString(descriptionLines),
      }),
    ]);
  }

  public static async announceTurnStand(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing turn stand.");
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        color: colors.BLACK,
        description: Utils.linesToString([
          `### ${channelState.session.currentPlayer.nameString} Stood`,
          "No card was drawn or discarded.",
        ]),
      }),
    ]);
  }

  public static async announceTurnStart(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Announcing turn start.");
    await this.__createChannelMessageEmbed(channelState.channelId, [
      new discordJs.EmbedBuilder({
        color: colors.BLACK,
        description: Utils.linesToString([
          `### ${icons.NEW_TURN} ${channelState.session.currentPlayer.nameString}'s Turn`,
          `${channelState.session.currentPlayer.tagString} use the **/play** command to take your turn.`,
        ]),
      }),
    ]);
  }

  public static async followupGameCreated(
    message: ChannelMessage,
  ): Promise<void> {
    Log.debug("Following up game created.");
    await this.__setChannelMessageFollowup(message, "You created a new game.");
  }

  public static async followupGameEnded(
    message: ChannelMessage,
  ): Promise<void> {
    Log.debug("Following up game ended.");
    await this.__setChannelMessageFollowup(
      message,
      "The previous game was ended.",
    );
  }

  public static async followupGameNotEnded(
    message: ChannelMessage,
  ): Promise<void> {
    Log.debug("Following up game not ended.");
    await this.__setChannelMessageFollowup(
      message,
      "The current game was not ended.",
    );
  }

  public static async followupTurnComplete(
    message: ChannelMessage,
  ): Promise<void> {
    Log.debug("Following up turn complete.");
    await this.__setChannelMessageFollowup(message, "Your turn is complete.");
  }

  public static async followupTurnIncomplete(
    message: ChannelMessage,
  ): Promise<void> {
    Log.debug("Following up turn incomplete.");
    await this.__setChannelMessageFollowup(message, "Your turn is incomplete.");
  }

  public static async informNoGame(message: ChannelMessage): Promise<void> {
    Log.debug("Informing no game.");
    await this.__setChannelMessageEmbed(message, [
      new discordJs.EmbedBuilder({
        color: colors.BLACK,
        description: Utils.linesToString([
          "### No Game",
          "There is no game currently active in this channel.",
          "-# Use the **/new** command to start a new game.",
        ]),
      }),
    ]);
  }

  public static async informNotPlaying(message: ChannelMessage): Promise<void> {
    Log.debug("Informing not playing.");
    await this.__setChannelMessageEmbed(message, [
      new discordJs.EmbedBuilder({
        color: colors.BLACK,
        description: Utils.linesToString([
          "### Not Playing",
          "You are not playing in the current game.",
        ]),
      }),
    ]);
  }

  public static async informNotTurn(
    message: ChannelMessage,
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Informing not turn.");
    await this.__setChannelMessageEmbed(message, [
      new discordJs.EmbedBuilder({
        color: colors.BLACK,
        description: Utils.linesToString([
          `### Not Your Turn`,
          `${channelState.session.currentPlayer.nameString} is currently taking their turn.`,
        ]),
      }),
    ]);
  }

  public static async informPlayerInfo(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Informing player info.");
    const player: Player = channelState.session.getPlayerById(message.user.id);
    const stateEmbed: discordJs.EmbedBuilder = this.__getStateEmbed(
      channelState,
      false,
      false,
      player,
    );
    await this.__setChannelMessageEmbed(message, [stateEmbed]);
  }

  public static async promptChooseDieRoll(
    message: ChannelCommandMessage,
    channelState: ChannelState,
    imposterCard: PlayerCard,
  ): Promise<number | undefined> {
    Log.debug("Prompting choose die roll.");
    const player: Player = channelState.session.getPlayerById(message.user.id);
    if (imposterCard.dieRolls.length !== 2) {
      Log.throw(
        "Could not resolve choose die roll prompt. There are not exactly 2 die rolls on the player card.",
        { imposterCard },
      );
    }
    const stateEmbed: discordJs.EmbedBuilder = this.__getStateEmbed(
      channelState,
      true,
      true,
      player,
    );
    await this.__setChannelMessageEmbed(
      message,
      [
        stateEmbed,
        new discordJs.EmbedBuilder({
          color: colors.BLACK,
          description: Utils.linesToString([
            "### Die Roll Selection",
            `Choose a die roll value to use for your ${this.__formatCardString(imposterCard)}.`,
          ]),
        }),
      ],
      [
        new discordJs.ButtonBuilder({
          customId: "firstDie",
          label: imposterCard.dieRolls[0].toString(),
          style: discordJs.ButtonStyle.Primary,
        }),
        new discordJs.ButtonBuilder({
          customId: "secondDie",
          label: imposterCard.dieRolls[1].toString(),
          style: discordJs.ButtonStyle.Primary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await this.__awaitButtonInteractionWithTimeout(
        message,
        "Die roll selection timed out.",
      );
    if (buttonInteraction === null) {
      return undefined;
    }
    switch (buttonInteraction.customId) {
      case "firstDie":
        return imposterCard.dieRolls[0];
      case "secondDie":
        return imposterCard.dieRolls[1];
      default:
        Log.throw(
          "Could not resolve choose die roll prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptChooseDiscardedCard(
    message: ChannelCommandMessage,
    channelState: ChannelState,
    drawnCard: Card,
  ): Promise<PlayerCard | undefined> {
    Log.debug("Prompting choose discarded card.");
    const player: Player = channelState.session.getPlayerById(message.user.id);
    const discardOptions: [PlayerCard, PlayerCard] =
      channelState.session.getDiscardOptionsForCurrentPlayer();
    const stateEmbed: discordJs.EmbedBuilder = this.__getStateEmbed(
      channelState,
      true,
      true,
      player,
    );
    await this.__setChannelMessageEmbed(
      message,
      [
        stateEmbed,
        new discordJs.EmbedBuilder({
          color: colors.BLACK,
          description: Utils.linesToString([
            "### Card Selection",
            `You drew ${this.__formatCardString(drawnCard)}. Choose the card you would like to keep.`,
          ]),
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
      await this.__awaitButtonInteractionWithTimeout(
        message,
        "Discard card selection timed out.",
      );
    if (buttonInteraction === null) {
      return undefined;
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
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<[CardSuit, DrawSource] | null | undefined> {
    Log.debug("Prompting choose draw deck.");
    const player: Player = channelState.session.getPlayerById(message.user.id);
    const buttons: discordJs.ButtonBuilder[] = [
      new discordJs.ButtonBuilder({
        customId: "sandDeck",
        label: `${icons.SAND_DECK}?`,
        style: discordJs.ButtonStyle.Primary,
      }),
      new discordJs.ButtonBuilder({
        customId: "bloodDeck",
        label: `${icons.BLOOD_DECK}?`,
        style: discordJs.ButtonStyle.Primary,
      }),
    ];
    const topBloodDiscardCard: Card | null =
      channelState.session.getTopDiscardCard(CardSuit.BLOOD);
    if (topBloodDiscardCard !== null) {
      buttons.push(
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
      buttons.unshift(
        new discordJs.ButtonBuilder({
          customId: "sandDiscard",
          label: this.__formatCardString(topSandDiscardCard, false),
          style: discordJs.ButtonStyle.Primary,
        }),
      );
    }
    buttons.push(
      new discordJs.ButtonBuilder({
        customId: "cancel",
        label: "Cancel",
        style: discordJs.ButtonStyle.Secondary,
      }),
    );
    const stateEmbed: discordJs.EmbedBuilder = this.__getStateEmbed(
      channelState,
      true,
      true,
      player,
    );
    await this.__setChannelMessageEmbed(
      message,
      [
        stateEmbed,
        new discordJs.EmbedBuilder({
          color: colors.BLACK,
          description: Utils.linesToString([
            "### Draw Selection",
            "Choose what you would like to draw.",
          ]),
        }),
      ],
      buttons,
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await this.__awaitButtonInteractionWithTimeout(
        message,
        "Turn action selection timed out.",
      );
    if (buttonInteraction === null) {
      return undefined;
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
      case "cancel":
        return null;
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
  ): Promise<TurnAction | null | undefined> {
    Log.debug("Prompting choose turn action.");
    const player: Player = channelState.session.getPlayerById(message.user.id);
    const stateEmbed: discordJs.EmbedBuilder = this.__getStateEmbed(
      channelState,
      false,
      true,
      player,
    );
    const descriptionLines: string[] = [
      "### Action Selection",
      "Choose your turn action.",
    ];
    if (player.availableTokenTotal === 0) {
      descriptionLines.push(
        "-# **Draw** is disabled because you have no remaining tokens.",
      );
    }
    await this.__setChannelMessageEmbed(
      message,
      [
        stateEmbed,
        new discordJs.EmbedBuilder({
          color: colors.BLACK,
          description: Utils.linesToString(descriptionLines),
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
        new discordJs.ButtonBuilder({
          customId: "cancel",
          label: "Cancel",
          style: discordJs.ButtonStyle.Secondary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await this.__awaitButtonInteractionWithTimeout(
        message,
        "Turn action selection timed out.",
      );
    if (buttonInteraction === null) {
      return undefined;
    }
    switch (buttonInteraction.customId) {
      case "draw":
        return TurnAction.DRAW;
      case "stand":
        return TurnAction.STAND;
      case "cancel":
        return null;
      default:
        Log.throw(
          "Could not resolve choose turn action prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptConfirmStand(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean | undefined> {
    Log.debug("Prompting confirm stand.");
    const player: Player = channelState.session.getPlayerById(message.user.id);
    const stateEmbed: discordJs.EmbedBuilder = this.__getStateEmbed(
      channelState,
      false,
      true,
      player,
    );
    await this.__setChannelMessageEmbed(
      message,
      [
        stateEmbed,
        new discordJs.EmbedBuilder({
          color: colors.BLACK,
          description: Utils.linesToString([
            "### Confirm Stand",
            "Are you sure that you want to stand?",
          ]),
        }),
      ],
      [
        new discordJs.ButtonBuilder({
          customId: "yes",
          label: "Yes",
          style: discordJs.ButtonStyle.Primary,
        }),
        new discordJs.ButtonBuilder({
          customId: "no",
          label: "No",
          style: discordJs.ButtonStyle.Secondary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await this.__awaitButtonInteractionWithTimeout(
        message,
        "Stand confirmation timed out.",
      );
    if (buttonInteraction === null) {
      return undefined;
    }
    switch (buttonInteraction.customId) {
      case "yes":
        return true;
      case "no":
        return false;
      default:
        Log.throw(
          "Could not resolve confirm stand prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptEndCurrentGame(
    message: ChannelMessage,
  ): Promise<true | null | undefined> {
    Log.debug("Prompting end current game.");
    await this.__setChannelMessageEmbed(
      message,
      [
        new discordJs.EmbedBuilder({
          color: colors.BLACK,
          description: Utils.linesToString([
            "### Game In Progress",
            "Do you want to end the current game and start a new one?",
          ]),
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
      await this.__awaitButtonInteractionWithTimeout(
        message,
        "New game creation timed out.",
      );
    if (buttonInteraction === null) {
      return undefined;
    }
    switch (buttonInteraction.customId) {
      case "endGame":
        return true;
      case "cancel":
        return null;
      default:
        Log.throw(
          "Could not resolve end current game prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptJoinGame(
    message: ChannelCommandMessage,
  ): Promise<discordJs.User[] | undefined> {
    Log.debug("Prompting join game.");
    let promptMessage: ChannelMessage | null = null;
    const userAccumulator: discordJs.User[] = [];
    while (userAccumulator.length + 1 < PLAYER_MAXIMUM) {
      const embed: discordJs.EmbedBuilder = new discordJs.EmbedBuilder({
        color: colors.WHITE,
        description: Utils.linesToString([
          "# New Game",
          `Hey ${Discord.formatChannelMentionString()}! A new Sabacc game was started by ${Discord.formatUserNameString(message.user)}.`,
        ]),
        fields: [
          {
            name: "Players",
            value: Utils.linesToString(
              [message.user, ...userAccumulator].map(
                user => `- ${Discord.formatUserNameString(user)}`,
              ),
            ),
          },
        ],
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
      if (promptMessage === null) {
        promptMessage = await this.__createChannelMessageEmbed(
          message.channelId,
          [embed],
          buttons,
        );
      } else {
        await this.__setChannelMessageEmbed(promptMessage, [embed], buttons);
      }
      const buttonInteraction: discordJs.ButtonInteraction | null =
        await this.__awaitButtonInteractionWithTimeout(
          promptMessage,
          "Game setup timed out.",
          600000,
        );
      if (buttonInteraction === null) {
        return undefined;
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
            promptMessage,
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
    if (promptMessage === null) {
      Log.throw(
        "Cannot conclude game setup prompt. Channel interaction was never set.",
      );
    }
    await this.__setChannelMessageFollowup(
      promptMessage,
      `${PLAYER_MAXIMUM.toString()} players have joined. The game has started!`,
    );
    return userAccumulator;
  }

  public static async promptRevealCards(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<true | null | undefined> {
    Log.debug("Prompting reveal cards.");
    const player: Player = channelState.session.getPlayerById(message.user.id);
    const stateEmbed: discordJs.EmbedBuilder = this.__getStateEmbed(
      channelState,
      false,
      true,
      player,
    );
    await this.__setChannelMessageEmbed(
      message,
      [
        stateEmbed,
        new discordJs.EmbedBuilder({
          color: colors.BLACK,
          description: Utils.linesToString([
            "### Reveal Cards",
            "Reveal your cards and end your hand.",
          ]),
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
      await this.__awaitButtonInteractionWithTimeout(
        message,
        "Card reveal timed out.",
      );
    if (buttonInteraction === null) {
      return undefined;
    }
    switch (buttonInteraction.customId) {
      case "reveal":
        return true;
      case "cancel":
        return null;
      default:
        Log.throw(
          "Could not resolve reveal cards prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptRollDice(
    message: ChannelCommandMessage,
    channelState: ChannelState,
    playerCard: PlayerCard,
  ): Promise<true | null | undefined> {
    Log.debug("Prompting roll dice.");
    const player: Player = channelState.session.getPlayerById(message.user.id);
    const stateEmbed: discordJs.EmbedBuilder = this.__getStateEmbed(
      channelState,
      false,
      true,
      player,
    );
    await this.__setChannelMessageEmbed(
      message,
      [
        stateEmbed,
        new discordJs.EmbedBuilder({
          color: colors.BLACK,
          description: Utils.linesToString([
            "### Roll Dice",
            `Roll the dice for your ${this.__formatCardString(playerCard)}.`,
          ]),
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
      await this.__awaitButtonInteractionWithTimeout(
        message,
        "Dice roll timed out.",
      );
    if (buttonInteraction === null) {
      return undefined;
    }
    switch (buttonInteraction.customId) {
      case "roll":
        return true;
      case "cancel":
        return null;
      default:
        Log.throw(
          "Could not resolve roll dice prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  private static async __awaitButtonInteractionWithTimeout(
    message: ChannelMessage,
    timeoutMessageContent: string,
    timeout: number = 60000,
  ): Promise<discordJs.ButtonInteraction | null> {
    Log.debug("Awaiting button interaction with timeout.");
    const interaction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction(timeout);
    if (interaction === null) {
      await this.__setChannelMessageFollowup(message, timeoutMessageContent);
    }
    return interaction;
  }

  private static async __createChannelMessageEmbed(
    channelId: string,
    embeds: discordJs.EmbedBuilder[],
    buttons?: discordJs.ButtonBuilder[],
  ): Promise<ChannelMessage> {
    Log.debug("Creating channel message embed.");
    return await Discord.sendChannelMessage(
      channelId,
      this.__createEmbedBaseMessageOptions(embeds, buttons),
    );
  }

  private static __createEmbedBaseMessageOptions(
    embeds: discordJs.EmbedBuilder[],
    buttons?: discordJs.ButtonBuilder[],
  ): discordJs.BaseMessageOptions {
    Log.debug("Creating embed base message options.");
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

  private static __formatCardPairNameString(
    cardOne: PlayerCard,
    cardTwo: PlayerCard,
  ): string | null {
    const cardOneValue: number = cardOne.getValue(cardTwo);
    const cardTwoValue: number = cardTwo.getValue(cardOne);
    const sylopSabaccValue: number = 0;
    const primeSabaccValue: number = 1;
    const cheapSabaccValue: number = 6;
    if (cardOneValue === cardTwoValue) {
      switch (cardOneValue) {
        case sylopSabaccValue:
          return "*Sylop Sabacc!* ✨";
        case primeSabaccValue:
          return "*Prime Sabacc!*";
        case cheapSabaccValue:
          return "*Cheap Sabacc!*";
        default:
          return "*Sabacc!*";
      }
    }
    return null;
  }

  private static __formatCardString(
    card: Card | PlayerCard,
    includeCodeQuotes: boolean = true,
  ): string {
    const playerCard: PlayerCard | null =
      card instanceof PlayerCard ? card : null;
    const actualCard: Card = card instanceof PlayerCard ? card.card : card;
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
        return icons.BLOOD_DECK;
      case CardSuit.SAND:
        return icons.SAND_DECK;
      default:
        Log.throw("Cannot format card suit icon. Unknown card suit.", {
          cardSuit,
        });
    }
  }

  private static __formatHandResultsString(channelState: ChannelState): string {
    const currentHandResult: HandResult =
      channelState.session.getCurrentHandResult();
    const resultsLines: string[] = [];
    const usedPlayerIds: string[] = [];
    currentHandResult.rankings.forEach(ranking => {
      const player: Player = channelState.session.getPlayerById(
        ranking.playerId,
      );
      resultsLines.push(this.__formatPlayerRankingString(player, ranking));
      usedPlayerIds.push(ranking.playerId);
    });
    const previouslyEliminatedLines: string[] = [];
    channelState.session.allPlayers.forEach(player => {
      if (!usedPlayerIds.includes(player.id)) {
        previouslyEliminatedLines.push(
          `~~${player.nameString}~~ ${icons.ELIMINATED}`,
        );
      }
    });
    return Utils.linesToString(resultsLines);
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

  private static __formatPlayerRankingString(
    player: Player,
    ranking: RankedPlayerScorable,
  ): string {
    return Utils.linesToString([
      `- \`#${(ranking.rankIndex + 1).toString()}\` ${player.status !== PlayerStatus.ACTIVE ? `~~**${player.nameString}**~~ ${icons.ELIMINATED}` : `**${player.nameString}**`}`,
      `  - Cards: ${this.__formatCardString(ranking.sandCard)} ${this.__formatCardString(ranking.bloodCard)}`,
      `  - Tokens: \`${this.__formatTokenResultString(player.tokenTotal, ranking.tokenLossTotal)}\` `,
      `    -# ${this.__formatRankingTokenDetailString(ranking)}`,
    ]);
  }

  private static __formatRankingTokenDetailString(
    ranking: RankedPlayerScorable,
  ): string {
    const tokenDetailStrings: string[] = [];
    if (ranking.tokenTotal > 0) {
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
    }
    return tokenDetailStrings.join(" + ");
  }

  private static __formatTableDiscardString(
    channelState: ChannelState,
  ): string {
    const topBloodDiscardCard: Card | null =
      channelState.session.getTopDiscardCard(CardSuit.BLOOD);
    const topSandDiscardCard: Card | null =
      channelState.session.getTopDiscardCard(CardSuit.SAND);
    const discardCardStrings: string[] = [];
    if (topSandDiscardCard !== null) {
      discardCardStrings.push(this.__formatCardString(topSandDiscardCard));
    }
    if (topBloodDiscardCard !== null) {
      discardCardStrings.push(this.__formatCardString(topBloodDiscardCard));
    }
    const discardLines: string[] = [discardCardStrings.join(" ")];
    if (topBloodDiscardCard === null && topSandDiscardCard === null) {
      discardLines.push(
        `-# \`${icons.SAND_DECK}\` and \`${icons.BLOOD_DECK}\` discard are both empty.`,
      );
    } else if (topBloodDiscardCard === null) {
      discardLines.push(`-# \`${icons.BLOOD_DECK}\` discard is empty.`);
    } else if (topSandDiscardCard === null) {
      discardLines.push(`-# \`${icons.SAND_DECK}\` discard is empty.`);
    }
    return Utils.linesToString(discardLines);
  }

  private static __formatTableHandRoundString(
    channelState: ChannelState,
  ): string {
    return `Hand: \`${(channelState.session.handIndex + 1).toString()}\` | Round: \`${channelState.session.roundIndex < 3 ? (channelState.session.roundIndex + 1).toString() : "REVEAL"}\``;
  }

  private static __formatTablePlayersString(
    channelState: ChannelState,
  ): string {
    const playersLines: string[] = [];
    channelState.session.activePlayersInTurnOrder.forEach((player, index) =>
      playersLines.push(
        `- ${player.nameString}${index === channelState.session.activePlayerIndex ? " 👤" : ""}`,
        `  - Tokens: ${this.__formatTokenStateString(player.availableTokenTotal, player.spentTokenTotal)}`,
      ),
    );
    return Utils.linesToString(playersLines);
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

  private static __getStateEmbed(
    channelState: ChannelState,
    hideDiscard: boolean,
    hidePlayers: boolean,
    player: Player | null = null,
  ): discordJs.EmbedBuilder {
    const fields: discordJs.APIEmbedField[] = [];
    if (!hideDiscard) {
      fields.push({
        name: "Discard",
        value: this.__formatTableDiscardString(channelState),
      });
    }
    if (!hidePlayers) {
      fields.push({
        name: "Players",
        value: this.__formatTablePlayersString(channelState),
      });
    }
    if (player !== null) {
      fields.push({
        inline: true,
        name: "Your Cards",
        value: this.__formatPlayerCardsString(player),
      });
      fields.push({
        inline: true,
        name: "Your Tokens",
        value: this.__formatTokenStateString(
          player.availableTokenTotal,
          player.spentTokenTotal,
        ),
      });
    }
    return new discordJs.EmbedBuilder({
      color: colors.BLACK,
      description: `### ${this.__formatTableHandRoundString(channelState)}`,
      fields,
    });
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
