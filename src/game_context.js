import {EcsContext, SpacialHashCell} from './engine/ecs_context.js';

/* Globals */
import {GlobalDrawer} from './global_drawer.js';
import {GlobalHud} from './global_hud.js';

/* Systems */
import {Collision} from './systems/collision.js';
import {Combat} from './systems/combat.js';
import {Observation} from './systems/observation.js';
import {KnowledgeRenderer} from './systems/knowledge_renderer.js';
import {PathPlanner} from './path_planner.js';
import {Fire} from './systems/fire.js';
import {Healing} from './systems/healing.js';
import {UpgradeOnDescent} from './systems/upgrade_on_descent.js';
import {Winning} from './systems/winning.js';
import {Bullets} from './systems/bullets.js';
import {AutoPickup} from './systems/auto_pickup.js';
import {Atmosphere} from './systems/atmosphere.js';
import {DeathEvents} from './systems/death_events.js';
import {TimedTransformations} from './systems/timed_transformations.js';
import {Teleport} from './systems/teleport.js';
import {DescendMessage} from './systems/descend_message.js';
import {AutoClimb} from './systems/auto_climb.js';

/* Components */
import {Components} from './components.js';

class GameCell extends SpacialHashCell {
    constructor(x, y, grid) {
        super(x, y, grid);
        this.opacity = 0;
        this.recompute();
    }

    recompute() {
        this.opacity = 0;
        for (let entity of this) {
            entity.with(Components.Opacity, (opacity) => {
                this.opacity += opacity.value;
            });
        }
    }
}

export class GameContext extends EcsContext(GameCell) {
    constructor(level) {
        super(level);
        this.victory = false;
    }

    initSystems() {
        super.initSystems();

        this.drawer = GlobalDrawer.Drawer;
        this.hud = GlobalHud.Hud;

        this.pathPlanner = new PathPlanner(this);
        this.collision = new Collision(this);
        this.combat = new Combat(this);
        this.observation = new Observation(this);
        this.knowledgeRenderer = new KnowledgeRenderer(this, this.drawer);
        this.fire = new Fire(this);
        this.healing = new Healing(this);
        this.upgradeOnDescent = new UpgradeOnDescent(this);
        this.winning = new Winning(this);
        this.bullets = new Bullets(this);
        this.autoPickup = new AutoPickup(this);
        this.atmosphere = new Atmosphere(this);
        this.deathEvents = new DeathEvents(this);
        this.timedTransformations = new TimedTransformations(this);
        this.teleport = new Teleport(this);
        this.descendMessage = new DescendMessage(this);
        this.autoClimb = new AutoClimb(this);
    }

    runReactiveSystems(action) {
        super.runReactiveSystems(action);

        this.collision.run(action);
        this.combat.run(action);
        this.fire.run(action);
        this.upgradeOnDescent.run(action);
        this.winning.run(action);
        this.bullets.run(action);
        this.autoPickup.run(action);
        this.atmosphere.run(action);
        this.deathEvents.run(action);
        this.teleport.run(action);
        this.descendMessage.run(action);
        this.autoClimb.run(action);
    }

    finalize() {
        super.finalize();
        this.atmosphere.refresh();
        for (let entity of this.entities) {
            entity.with(Components.Observer, (observer) => {
                observer.knowledge.getGrid(this).familiarize();
            });
        }
    }

    runContinuousSystems(timeDelta) {
        super.runContinuousSystems(timeDelta);

        this.fire.progress(timeDelta);
        this.healing.progress(timeDelta);
        this.atmosphere.progress(timeDelta);
        this.timedTransformations.progress(timeDelta);
    }

    beforeTurn(entity) {
        super.beforeTurn(entity);

        if (entity.is(Components.Observer)) {
            this.observation.run(entity);
        }

        if (entity.is(Components.PlayerCharacter)) {
            this.knowledgeRenderer.run(entity);
            this.hud.update(entity);
            this.hud.messageChanged = false;
        }
    }

    afterTurn(entity) {
        super.afterTurn(entity);
    }

    addEntity(entity) {
        super.addEntity(entity);
        entity.with(Components.Observer, (observer) => {
            observer.knowledge.maybeAddEcsContext(this);
        });
    }

    removeEntity(entity) {
        super.removeEntity(entity);
    }

    updatePlayer() {
        super.updatePlayer();

        this.observation.run(this.playerCharacter);
        this.knowledgeRenderer.run(this.playerCharacter);
        this.hud.update(this.playerCharacter);
    }
}
