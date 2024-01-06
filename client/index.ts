import Phaser from "phaser";
import { Client, Room } from "colyseus.js";

// custom scene class
export class GameScene extends Phaser.Scene {

    client = new Client("ws://localhost:2567");

    room: Room;
    playerEntities: {[sessionId: string]: any} = {};

    currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    playerPositionOnServer: Phaser.GameObjects.Rectangle;

    inputPayload = {
        left: false,
        right: false,
        up: false,
        down: false,
    };
    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

    preload() {
        // preload scene
        this.load.image('ship_0001', 'https://cdn.glitch.global/3e033dcd-d5be-4db4-99e8-086ae90969ec/ship_0001.png');

        this.cursorKeys = this.input.keyboard.createCursorKeys();
    }

    async create() {
        console.log("Joining room...");

        try {
            this.room = await this.client.joinOrCreate("my_room");
            console.log("Joined successfully!");

            this.room.state.players.onAdd((player, sessionId) => {
                console.log("A player has joined! Their unique session id is", sessionId);
                const entity = this.physics.add.image(player.x, player.y, 'ship_0001');
                entity.setData('serverX', player.x);
                entity.setData('serverY', player.y);
                this.playerEntities[sessionId] = entity;

                if (sessionId === this.room.sessionId) {
                    // this is the current player!
                    // (we are going to treat it differently during the update loop)
                    this.currentPlayer = entity;

                    // remoteRef is being used for debug only
                    this.playerPositionOnServer = this.add.rectangle(0, 0, entity.width, entity.height);
                    this.playerPositionOnServer.setStrokeStyle(1, 0xff0000);

                    player.onChange(() => {
                        this.playerPositionOnServer.x = player.x;
                        this.playerPositionOnServer.y = player.y;
                    });

                } else {
                    // all remote players are here!
                    // (same as before, we are going to interpolate remote players)
                    player.onChange(() => {
                        entity.setData('serverX', player.x);
                        entity.setData('serverY', player.y);
                    });
                }
            });

            this.room.state.players.onRemove((player, sessionId) => {
                const entity = this.playerEntities[sessionId];
                if (entity) {
                    // destroy entity
                    entity.destroy();

                    // clear local reference
                    delete this.playerEntities[sessionId];
                }
            });

        } catch (e) {
            console.error(e);
        }
    }

    elapsedTime = 0;
    fixedTimeStep = 1000 / 60;

    frameCounter = 0


    update(time: number, delta: number): void {
        // skip loop if not connected yet.
        if (!this.currentPlayer) { return; }

        this.frameCounter++
        this.elapsedTime += delta;

        if (this.elapsedTime >= this.fixedTimeStep) {
            console.log("update frame " + this.frameCounter)
            this.elapsedTime -= this.fixedTimeStep;
            this.fixedTick(time, this.fixedTimeStep);
        }
    }

    fixedTick(time, delta) {
        // skip loop if not connected yet.
        if (!this.currentPlayer) { return; }

        this.inputPayload.left = this.cursorKeys.left.isDown;
        this.inputPayload.right = this.cursorKeys.right.isDown;
        this.inputPayload.up = this.cursorKeys.up.isDown;
        this.inputPayload.down = this.cursorKeys.down.isDown;
        this.room.send(0, this.inputPayload);

        const velocity = 4;
        if (this.inputPayload.left) {
            this.currentPlayer.x -= velocity;

        } else if (this.inputPayload.right) {
            this.currentPlayer.x += velocity;
        }

        if (this.inputPayload.up) {
            this.currentPlayer.y -= velocity;

        } else if (this.inputPayload.down) {
            this.currentPlayer.y += velocity;
        }

        for (let sessionId in this.playerEntities) {
            // do not interpolate the current player
            if (sessionId === this.room.sessionId) {
                continue;
            }

            // interpolate all other player entities
            const entity = this.playerEntities[sessionId];
            const { serverX, serverY } = entity.data.values;


            entity.x = Phaser.Math.Linear(entity.x, serverX, this.t);
            entity.y = Phaser.Math.Linear(entity.y, serverY, this.t);
        }
    }
    t = .4
}

// game config
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#b6d53c',
    parent: 'phaser-example',
    physics: { default: "arcade" },
    pixelArt: true,
    scene: [ GameScene ],
};

// instantiate the game
const game = new Phaser.Game(config);