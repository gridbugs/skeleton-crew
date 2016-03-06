import {EntityPrototypes} from 'entity_prototypes';
import {makeEnum} from 'utils/enum';
import {CellGrid, Cell} from 'utils/cell_grid';
import {DijkstraMap, DijkstraCell} from 'utils/dijkstra_map';
import {Stack} from 'utils/stack';
import {Config} from 'config';
import {SearchQueue} from 'utils/search_queue';
import * as ArrayUtils from 'utils/array_utils';
import * as Random from 'utils/random';

const CellType = makeEnum([
    'Void',
    'Wall',
    'Floor',
    'Window'
]);

class HullCell extends DijkstraCell {
    constructor(x, y, grid) {
        super(x, y, grid);
        this._visited = false;
        this.generatorCell = null;
    }

    get visited() {
        return this._visited;
    }

    set visited(value) {
        this._visited = value;
        if (value && this.value !== 0) {
            this.grid.hull.push(this.coord);
        }
    }

    isEnterable(fromCell) {
        return fromCell.generatorCell.type !== CellType.Wall;
    }
}

class HullMap extends DijkstraMap(HullCell) {
    constructor(width, height) {
        super(width, height);
        this.hull = new Stack();
    }
    clear() {
        super.clear();
        this.hull.clear();
    }
}

class TorroidCell extends DijkstraCell {
    constructor(x, y, grid) {
        super(x, y, grid);
        this.generatorCell = null;
    }
}
class TorroidMap extends DijkstraMap(TorroidCell) {}

class RoomCell extends DijkstraCell {
    constructor(x, y, grid) {
        super(x, y, grid);
        this.generatorCell = null;
    }
}
class RoomMap extends DijkstraMap(RoomCell) {}

class GeneratorCell extends Cell {
    constructor(x, y, grid) {
        super(x, y, grid);
        this.type = CellType.Void;
        this.group = -1;
        this.hull = false;
        this.floorCount = -1;
        this.wallCount = -1;
    }

    floodFillCompare(cell) {
        if (this.type === cell.type) {
            return 0;
        } else {
            return 1;
        }
    }
}

class GeneratorGrid extends CellGrid(GeneratorCell) {}

export class ShipGenerator {
    constructor() {
        this.grid = new GeneratorGrid(Config.GRID_WIDTH, Config.GRID_HEIGHT);
        this.hullMap = new HullMap(Config.GRID_WIDTH, Config.GRID_HEIGHT);
        this.torroidMap = new TorroidMap(Config.GRID_WIDTH, Config.GRID_HEIGHT);
        this.roomMap = new RoomMap(Config.GRID_WIDTH, Config.GRID_HEIGHT);
        this.roomMap.squareCircles = true;

        for (let hullCell of this.hullMap) {
            hullCell.generatorCell = this.grid.get(hullCell.coord);
        }
        for (let torroidCell of this.torroidMap) {
            torroidCell.generatorCell = this.grid.get(torroidCell.coord);
        }
        for (let roomCell of this.roomMap) {
            roomCell.generatorCell = this.grid.get(roomCell.coord);
        }

        this.queue = new SearchQueue();
        this.biggestGroup = -1;
        this.biggestFloorGroup = -1;
    }

    *voidCoords() {
        let voidSet = new Set();
        for (let region of this.grid.floodFill()) {
            let first = true;
            let type;
            for (let cell of region) {
                if (first) {
                    type = cell.type;
                    first = false;
                }
                if (type === CellType.Void) {
                    yield cell.coord;
                }
            }
        }
    }

    *hullCoords() {
        this.hullMap.clear();
        this.hullMap.computeFromZeroCoords(this.voidCoords());
        yield* this.hullMap.hull;
    }

    cutHole(centre, minSize, maxSize) {
        let width = Random.getRandomIntInclusive(minSize, maxSize);
        let height = Random.getRandomIntInclusive(minSize, maxSize);

        let startX = centre.x - Math.floor(width / 2);
        let startY = centre.y - Math.floor(height / 2);
        for (let j = 0; j < height; ++j) {
            let y = j + startY;
            for (let k = 0; k < width; ++k) {

                let x = k + startX;

                if (this.grid.isValid(x, y)) {
                    this.grid.get(x, y).type = CellType.Void;
                }

            }
        }
    }

    cutout(minAmount, maxAmount, minSize, maxSize) {
        let hullCoords = [];
        for (let coord of this.hullCoords()) {
            hullCoords.push(coord);
        }
        ArrayUtils.shuffleInPlace(hullCoords);

        let amount = Random.getRandomIntInclusive(minAmount, maxAmount);
        for (let i = 0; i < amount; ++i) {
            let centre = hullCoords[i];
            this.cutHole(centre, minSize, maxSize);
        }
    }

    updateGroups() {
        let group = 0;
        this.biggestGroup = -1;
        this.biggestFloorGroup = -1;
        let biggestGroupSize = -1;
        let biggestFloorGroupSize = -1;
        for (let region of this.grid.floodFill()) {
            let first = true;
            let type;
            let count = 0;
            for (let cell of region) {
                if (first) {
                    type = cell.type;
                    first = false;
                }
                if (type !== CellType.Void) {
                    cell.group = group;
                    ++count;
                }
            }
            if (type !== CellType.Void) {
                if (biggestGroupSize < count) {
                    this.biggestGroup = group;
                    biggestGroupSize = count;
                }
                if (type === CellType.Floor && biggestFloorGroupSize < count) {
                    this.biggestFloorGroup = group;
                    biggestFloorGroupSize = count;
                }
                ++group;
            }
        }
    }

    keepBiggestGroup() {
        this.updateGroups();
        for (let cell of this.grid) {
            if (cell.type !== CellType.Void && cell.group !== this.biggestGroup) {
                cell.type = CellType.Void;
            }
        }
    }

    keepBiggestFloorGroup() {
        this.updateGroups();
        for (let cell of this.grid) {
            if (cell.type === CellType.Floor && cell.group !== this.biggestFloorGroup) {
                cell.type = CellType.Wall;
            }
        }
    }

    makeHollow() {
        for (let coord of this.hullCoords()) {
            this.grid.get(coord).hull = true;
        }
        for (let cell of this.grid) {
            if (cell.type !== CellType.Void && !cell.hull) {
                cell.type = CellType.Floor;
            }
        }
    }

    makeFilled() {
        for (let cell of this.grid) {
            if (cell.type !== CellType.Void) {
                cell.type = CellType.Wall;
            }
        }
    }

    updateNeighbourCounts() {
        for (let cell of this.grid) {
            let floorCount = 0;
            let wallCount = 0;
            for (let neighbour of cell.neighbours) {
                if (neighbour.type === CellType.Floor) {
                    ++floorCount;
                } else if (neighbour.type === CellType.Wall) {
                    ++wallCount;
                }
            }
            cell.floorCount = floorCount;
            cell.wallCount = wallCount;
        }
    }

    removeDeadEnds() {
        this.updateNeighbourCounts();
        for (let cell of this.grid) {
            if (cell.type === CellType.Floor && cell.floorCount <= 1) {
                this.queue.insert(cell);
            }
        }

        this.queue.clear();
        for (let cell of this.grid) {
            let floorCount = 0;
            let wallCount = 0;
            for (let neighbour of cell.neighbours) {
                if (neighbour.type === CellType.Floor) {
                    ++floorCount;
                } else if (neighbour.type === CellType.Wall) {
                    ++wallCount;
                }
            }
            cell.floorCount = floorCount;
            cell.wallCount = wallCount;
            if (cell.type === CellType.Floor && floorCount <= 1) {
                this.queue.insert(cell);
            }
        }

        while (!this.queue.empty) {
            let cell = this.queue.remove();
            cell.type = CellType.Wall;
            for (let neighbour of cell.neighbours) {
                --neighbour.floorCount;
                /* check cell.floorCount rather than neighbour.floorCount
                 * to prevent leaving a nub of halls that are removed. The nub would
                 * have more than one open neighbour, but should still be removed
                 */
                if (neighbour.type === CellType.Floor && cell.floorCount <= 1) {
                    this.queue.insert(neighbour);
                }
            }
        }
    }

    removeExcessHull() {
        let floor = new Set();
        for (let cell of this.grid) {
            if (cell.type === CellType.Floor) {
                floor.add(cell);
            }
            cell.hull = false;
        }

        this.hullMap.clear();
        this.hullMap.computeFromZeroCoords(floor);
        for (let coord of this.hullMap.hull) {
            this.grid.get(coord).hull = true;
        }

        for (let cell of this.grid) {
            if (cell.type == CellType.Wall && !cell.hull) {
                cell.type = CellType.Void;
            }
        }
    }

    makeHoles(minAmount, maxAmount, minSize, maxSize, threshold) {

        this.torroidMap.clear();
        this.torroidMap.computeFromZeroCoords(this.voidCoords());
        let furthest = -1;
        for (let cell of this.torroidMap) {
            furthest = Math.max(furthest, cell.value);
        }
        let limit = furthest - threshold;
        let candidates = [];
        for (let cell of this.torroidMap) {
            if (cell.value >= limit) {
                candidates.push(cell.coord);
            }
        }

        ArrayUtils.shuffleInPlace(candidates);
        let amount = Random.getRandomIntInclusive(minAmount, maxAmount);
        for (let i = 0; i < amount; ++i) {
            let centre = candidates[i];
            this.cutHole(centre, minSize, maxSize);
        }
    }

    addWindows() {
        this.updateNeighbourCounts();
        for (let cell of this.grid) {
            if (cell.type === CellType.Wall && (cell.floorCount === 2 || cell.floorCount === 3) &&
                cell.wallCount < 4) {

                if (Math.random() < 0.2) {
                    cell.type = CellType.Window;
                }
            }
        }
    }

    generateHull() {
        this.cutout(3, 3, 17, 20);
        this.cutout(6, 6, 8, 10);
        this.cutout(10, 10, 4, 5);

        this.keepBiggestGroup();
//        this.makeHoles(3, 4, 4, 8, 1);


        this.makeHollow();

        /* Repeat as removing dead ends can create more dead ends */
        for (let i = 0; i < 8; ++i) {
            this.removeDeadEnds();
        }

        this.keepBiggestFloorGroup();

        this.removeExcessHull();

        this.makeFilled();

        /* Floating groups may have appeared as excess hull was removed */
        this.keepBiggestGroup();

        this.makeHollow();

        this.generateRooms();

        for (let i = 0; i < 8; ++i) {
            this.removeDeadEnds();
        }
        this.removeExcessHull();

    }

    generateRooms() {
        let PADDING = 20;
        let lengths = [];
        for (let i = 0; i < this.grid.width; ++i) {
            lengths[i] = {length: 0, start: 0, total: 0};
        }

        for (let i = PADDING; i < this.grid.width - PADDING; ++i) {
            let start = 0;
            let length = 0;
            for (let j = 0; j < this.grid.height; ++j) {
                let cell = this.grid.get(i, j);
                if (cell.type === CellType.Floor) {
                    ++length;
                } else {
                    if (length > lengths[i].length) {
                        lengths[i] = {
                            length: Math.max(lengths[i].length, length),
                            start: start,
                            total: 0,
                            end: j
                        };
                    }
                    length = 0;
                    start = j;
                }
            }
        }

        let max = 0;
        let maxIndex = 0;
        for (let i = 2; i < this.grid.width - 2; ++i) {
            lengths[i].total = lengths[i-1].length + lengths[i].length + lengths[i+1].length + lengths[i+2].length + lengths[i-2].length;
            if (lengths[i].total > max) {
                max = lengths[i].total;
                maxIndex = i;
            }
        }

        for (let i = lengths[maxIndex - 2].start; i < lengths[maxIndex - 2].end; ++i) {
            this.grid.get(maxIndex - 2, i).type = CellType.Wall;
        }
        for (let i = lengths[maxIndex + 2].start; i < lengths[maxIndex + 2].end; ++i) {
            this.grid.get(maxIndex + 2, i).type = CellType.Wall;
        }

        let verticalMid = maxIndex;

        PADDING = 10;
        lengths = [];
        for (let i = 0; i < this.grid.height; ++i) {
            lengths[i] = {length: 0, start: 0, total: 0};
        }
        for (let i = PADDING; i < this.grid.height - PADDING; ++i) {
            let start = 0;
            let length = 0;
            for (let j = 0; j <= verticalMid - 2; ++j) {
                let cell = this.grid.get(j, i);
                if (cell.type === CellType.Floor) {
                    ++length;
                } else {
                    if (length > lengths[i].length) {
                        lengths[i] = {
                            length: Math.max(lengths[i].length, length),
                            start: start,
                            total: 0,
                            end: j
                        };
                    }
                    length = 0;
                    start = j;
                }
            }
        }

        max = 0;
        maxIndex = 0;
        for (let i = 2; i < this.grid.height - 2; ++i) {
            lengths[i].total = lengths[i-1].length + lengths[i].length + lengths[i+1].length + lengths[i+2].length + lengths[i-2].length;
            if (lengths[i].total > max) {
                max = lengths[i].total;
                maxIndex = i;
            }
        }
        for (let i = lengths[maxIndex - 2].start; i < lengths[maxIndex - 2].end; ++i) {
            this.grid.get(i, maxIndex - 2).type = CellType.Wall;
        }
        for (let i = lengths[maxIndex + 2].start; i < lengths[maxIndex + 2].end; ++i) {
            this.grid.get(i, maxIndex + 2).type = CellType.Wall;
        }

        this.grid.get(verticalMid - 2, maxIndex - 1).type = CellType.Floor;
        this.grid.get(verticalMid - 2, maxIndex).type = CellType.Floor;
        this.grid.get(verticalMid - 2, maxIndex + 1).type = CellType.Floor;


        PADDING = 10;
        lengths = [];
        for (let i = 0; i < this.grid.height; ++i) {
            lengths[i] = {length: 0, start: 0, total: 0};
        }
        for (let i = PADDING; i < this.grid.height - PADDING; ++i) {
            let start = 0;
            let length = 0;
            for (let j = verticalMid + 2; j < this.grid.width; ++j) {
                let cell = this.grid.get(j, i);
                if (cell.type === CellType.Floor) {
                    ++length;
                } else {
                    if (length > lengths[i].length) {
                        lengths[i] = {
                            length: Math.max(lengths[i].length, length),
                            start: start,
                            total: 0,
                            end: j
                        };
                    }
                    length = 0;
                    start = j;
                }
            }
        }

        max = 0;
        maxIndex = 0;
        for (let i = 2; i < this.grid.height - 2; ++i) {
            lengths[i].total = lengths[i-1].length + lengths[i].length + lengths[i+1].length + lengths[i+2].length + lengths[i-2].length;
            if (lengths[i].total > max) {
                max = lengths[i].total;
                maxIndex = i;
            }
        }
        for (let i = lengths[maxIndex - 2].start; i < lengths[maxIndex - 2].end; ++i) {
            this.grid.get(i, maxIndex - 2).type = CellType.Wall;
        }
        for (let i = lengths[maxIndex + 2].start; i < lengths[maxIndex + 2].end; ++i) {
            this.grid.get(i, maxIndex + 2).type = CellType.Wall;
        }

        this.grid.get(verticalMid + 2, maxIndex - 1).type = CellType.Floor;
        this.grid.get(verticalMid + 2, maxIndex).type = CellType.Floor;
        this.grid.get(verticalMid + 2, maxIndex + 1).type = CellType.Floor;

    }

    generate(level, ecsContext) {

        for (let cell of this.grid) {
            if (!cell.isBorder()) {
                cell.type = CellType.Wall;
            }
        }

        this.generateHull();

        for (let cell of this.grid) {
            switch (cell.type) {
                case CellType.Void: {
                    ecsContext.emplaceEntity(EntityPrototypes.Void(cell.x, cell.y));
                    break;
                }
                case CellType.Wall: {
                    ecsContext.emplaceEntity(EntityPrototypes.Wall(cell.x, cell.y));
                    break;
                }
                case CellType.Floor: {
                    ecsContext.emplaceEntity(EntityPrototypes.Floor(cell.x, cell.y));
                    break;
                }
                case CellType.Window: {
                    ecsContext.emplaceEntity(EntityPrototypes.Window(cell.x, cell.y));
                    break;
                }
            }
        }

        ecsContext.emplaceEntity(EntityPrototypes.PlayerCharacter(0, 0));
    }
}
