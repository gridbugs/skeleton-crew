import {ReactiveSystem} from '../engine/reactive_system.js';
import {Actions} from '../actions.js';
import {Components} from '../components.js';

export class Bullets extends ReactiveSystem {
    constructor(ecsContext) {
        super(ecsContext);
        this.on(Actions.ProjectileCollide, (action) => {
            if (action.entity.is(Components.Bullet)) {
                this.ecsContext.scheduleImmediateAction(
                        new Actions.GetShot(action.contact, action.entity, action.trajectory));
            }
            if (action.entity.is(Components.ShockWave)) {
                this.ecsContext.scheduleImmediateAction(
                        new Actions.ShockWaveHit(action.contact, action.entity, action.trajectory));
            }
            if (action.entity.is(Components.Rocket)) {
                this.ecsContext.scheduleImmediateAction(
                        new Actions.Explode(action.entity.cell.coord, 5));
                for (let entity of action.entity.cell) {
                    this.ecsContext.scheduleImmediateAction(
                            new Actions.RocketHit(entity, action.entity, action.trajectory));
                }
            }
        });
    }
}
