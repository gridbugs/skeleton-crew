import {ReactiveSystem} from '../engine/reactive_system.js';
import {Actions} from '../actions.js';
import {Components} from '../components.js';

export class Teleport extends ReactiveSystem {
    constructor(ecsContext) {
        super(ecsContext);

        this.on(Actions.Walk, (action) => {
            let destination = this.getCell(action.destination);

            if (destination.has(Components.Teleport)) {
                this.ecsContext.scheduleImmediateAction(
                    new Actions.Win(action.entity),
                    200
                );
            }
        });
    }
}
