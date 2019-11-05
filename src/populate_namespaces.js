/* Import the namespace objects */
import {TerrainGenerators} from './terrain_generators.js';
import {EntityPrototypes} from './entity_prototypes.js';
import {Components} from './components.js';
import {Actions} from './actions.js';
import {Weapons} from './weapons.js';

/* Import names with which to populate namespaces */
import * as EngineComponents from './engine/engine_components.js';
import * as CoreComponent from './components/core_component.js';
import * as Door from './components/door.js';
import * as StatComponent from './components/stat_component.js';
import * as TileComponent from './components/tile_component.js';

import * as CoreEntityPrototype from './entities/core_entity_prototype.js';
import * as CharacterEntityPrototype from './entities/character_entity_prototype.js';

import * as StringTerrainGenerator from './string_terrain_generator.js';

import * as CoreAction from './actions/core_action.js';

import * as Guns from './weapons/guns.js'
import * as Flamethrowers from './weapons/flamethrowers.js'
import * as RocketLauncher from './weapons/rocket_launcher.js'

function populateNamespace(sources, dest) {
    let count = 0;

    for (let src of sources) {
        for (let name in src) {
            let exported = src[name];

            if (typeof exported === 'function') {
                if (exported.type === undefined) {
                    exported.type = count;
                    ++count;
                } else {
                    count = Math.max(count, exported.type + 1);
                }

                dest[name] = exported;
            }
        }
    }

    dest.length = count;
}

populateNamespace([StringTerrainGenerator], TerrainGenerators);
populateNamespace([CoreEntityPrototype, CharacterEntityPrototype], EntityPrototypes);
populateNamespace([CoreComponent, Door, EngineComponents, StatComponent, TileComponent], Components);
populateNamespace([CoreAction], Actions);
populateNamespace([Guns, Flamethrowers, RocketLauncher], Weapons);
