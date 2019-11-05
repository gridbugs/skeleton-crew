import {Typed} from './engine/typed.js';
import {ControlTypes} from './control.js';
import {CellGrid, Cell} from './utils/cell_grid.js';
import {Stack} from './utils/stack.js';
import {Config} from './config.js';

export class Weapon extends Typed {
    addAmmoFromWeapon(weapon) {
        let originalAmmo = this.ammo;
        this.ammo = Math.min(this.ammo + weapon.ammo, this.maxAmmo);
        let ammoDiff = this.ammo - originalAmmo;
        weapon.ammo -= ammoDiff;
    }

    getSpreadCentre(line) {
        let cell;
        for (let coord of line.infiniteAbsoluteCoords()) {
            if (!Weapon.SpreadGrid.isValid(coord)) {
                break;
            }

            cell = Weapon.SpreadGrid.get(coord);

            if (coord.getDistance(line.startCoord) >= this.range) {
                break;
            }
        }
        return cell;
    }
}
Weapon.prototype.getLine = async function(entity) {
    return await entity.ecsContext.pathPlanner.getLine(entity.cell.coord, ControlTypes.Fire);
}

Weapon.SpreadGrid = new (CellGrid(Cell))(Config.GRID_WIDTH, Config.GRID_HEIGHT);
Weapon.SpreadStack = new Stack();
