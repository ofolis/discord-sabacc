import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CollectorFilter,
  ComponentType,
  InteractionCollector,
  Message,
  User,
} from "discord.js";
import {
  Messaging,
  Play,
} from ".";
import {
  GameSessionStatus,
} from "../../enums";
import {
  IO,
} from "../../io";
import {
  GameSession,
  GameSessionPlayer,
} from "../../types";
import {
  Utils,
} from "../../utils";

export class Session {
  private static async handleJoinButtonPress(
    session: GameSession,
    buttonInteraction: ButtonInteraction,
    gameMessage: Message,
    joinButton: ButtonBuilder,
    startButton: ButtonBuilder,
  ): Promise<void> {
    if (!session.players.some(player => player.id === buttonInteraction.user.id)) {
      // Add the new player
      const newPlayer: GameSessionPlayer = {
        "currentPlayedTokenTotal": 0,
        "currentUnplayedTokenTotal": 0,
        "id": buttonInteraction.user.id,
        "username": buttonInteraction.user.username,
      };
      session.players.push(newPlayer);
      this.save(session);
      // Update the message
      await gameMessage.edit({
        "content": Messaging.getNewGameMessageContent(
          session,
          [
            "**Click the button below to join!**",
          ],
        ),
        "components": [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            joinButton,
            startButton.setDisabled(session.players.length < 2), // Enable when there are 2+ players
          ),
        ],
      });
    }
    await buttonInteraction.deferUpdate(); // Acknowledge the interaction
  }

  private static async handleStartButtonPress(
    session: GameSession,
    gameMessage: Message,
    collector: InteractionCollector<ButtonInteraction>,
  ): Promise<void> {
    // Lock the new game message
    await gameMessage.edit({
      "content": Messaging.getNewGameMessageContent(
        session,
        [
          "**The game has started!**",
          "",
          "-# Use the **/info** command to view your hand and see game info.",
        ],
      ),
      "components": [
      ], // Remove the buttons
    });
    // Start the session
    for (const player of session.players) {
      player.currentPlayedTokenTotal = 0;
      player.currentUnplayedTokenTotal = session.startingTokenTotal;
    };
    session.players = Utils.shuffleArray(session.players);
    session.startedAt = Date.now();
    session.status = GameSessionStatus.ACTIVE;
    this.save(session);
    // End the collector
    collector.stop();
    // Begin first turn
    await Play.startTurn(
      session.guildId,
      session.channelId,
    );
  }

  public static async createNew(
    guildId: string,
    channelId: string,
    startingUser: User,
    startingTokenTotal: number,
  ): Promise<void> {
    // Initialize session
    const startingPlayer: GameSessionPlayer = {
      "currentPlayedTokenTotal": 0,
      "currentUnplayedTokenTotal": 0,
      "id": startingUser.id,
      "username": startingUser.username,
    };
    const session: GameSession = {
      "channelId": channelId,
      "currentPlayerIndex": 0,
      "currentRoundIndex": 0,
      "currentTurnIndex": 0,
      "guildId": guildId,
      "players": [
        startingPlayer,
      ],
      "startingPlayer": startingPlayer,
      "startingTokenTotal": startingTokenTotal,
      "status": GameSessionStatus.PENDING,
    };
    this.save(session);
    // Prompt channel users to join
    const joinButton: ButtonBuilder = new ButtonBuilder()
      .setCustomId("joinGame")
      .setLabel("Join Game")
      .setStyle(ButtonStyle.Primary);
    const startButton: ButtonBuilder = new ButtonBuilder()
      .setCustomId("startGame")
      .setLabel("Start Game")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true);
    const gameMessage: Message = await Messaging.sendMessage(
      channelId,
      Messaging.getNewGameMessageContent(
        session,
        [
          "**Click the button below to join!**",
        ],
      ),
      [
        joinButton,
        startButton,
      ],
    );
    // Listen for user join requests
    const collectorFilter: CollectorFilter<[ButtonInteraction]> = (buttonInteraction: ButtonInteraction) =>
      buttonInteraction.message.id === gameMessage.id && [
        "joinGame",
        "startGame",
      ].includes(buttonInteraction.customId);
    const tenMinuteMilliseconds: number = 600000;
    const collector: InteractionCollector<ButtonInteraction> = gameMessage.createMessageComponentCollector({
      "filter": collectorFilter,
      "componentType": ComponentType.Button,
      "time": tenMinuteMilliseconds,
    });
    collector.on(
      "collect",
      async(buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.customId === "joinGame") {
          await this.handleJoinButtonPress(
            session,
            buttonInteraction,
            gameMessage,
            joinButton,
            startButton,
          );
        } else if (buttonInteraction.customId === "startGame") {
          await this.handleStartButtonPress(
            session,
            gameMessage,
            collector,
          );
        }
      },
    );
    collector.on(
      "end",
      async() => {
        // On timeout
        if (session.status === GameSessionStatus.PENDING && gameMessage.editable) {
          await gameMessage.edit({
            "content": Messaging.getNewGameMessageContent(
              session,
              [
                "**Game setup timed out!**",
              ],
            ),
            "components": [
            ], // Remove the buttons
          });
        }
      },
    );
  }

  public static isInProgress(guildId: string, channelId: string): boolean {
    const loadResult: GameSession | null = IO.loadData<GameSession>(
      `${guildId}${channelId}`,
    );
    if (loadResult === null) {
      return false;
    }
    return loadResult.status !== GameSessionStatus.COMPLETED;
  }

  public static load(guildId: string, channelId: string): GameSession {
    const loadResult: GameSession | null = IO.loadData<GameSession>(
      `${guildId}${channelId}`,
    );
    if (loadResult === null) {
      throw new Error(`No session exists for guild ${guildId} channel ${channelId}.`);
    }
    return loadResult;
  }

  public static save(session: GameSession): void {
    IO.saveData(
      `${session.guildId}${session.channelId}`,
      session,
    );
  }
}
