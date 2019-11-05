import {Turn} from './engine/turn.js';
import {Action} from './engine/action.js';

import {Actions} from './actions.js';
import {Direction} from './utils/direction.js';

import * as Input from './utils/input.js';
import * as Control from './control.js';
import {Controller} from './controller.js';

async function getControlAction(entity) {
    while (true) {
        var fn = await Control.getControl();

        if (fn === null) {
            continue;
        }

        var action = await fn(entity);
        if (action === null) {
            continue;
        }

        return action;
    }
}

export class PlayerTurnTaker extends Controller{}

PlayerTurnTaker.prototype.takeTurn = async function() {
    var action = await getControlAction(this.entity);
    if (action instanceof Action) {
        return new Turn(action);
    } else if (action instanceof Turn) {
        return action;
    } else {
        throw Error('invalid action');
    }
}
