import { PriorityQueue, ICompare } from '@datastructures-js/priority-queue';
import { getDistance } from 'geolib';
const precision = 0.01;

import { Coordinate, BuildingFloor, Location, Edge, GeoJsonLine, GeoJsonStairs, GeoJsonDoorOrOpen, GeoJson } from './types';
export { Coordinate, BuildingFloor, Location, Edge };

//<-------------------- for Dijkstra's algorithm ------------------------------>

export class AdjacencyList {
    private readonly _map: Map<String, Edge[]>;

    constructor(geoJson: GeoJson) {
        this._map = new Map();

        // add lines as edges
        (geoJson.features.filter(f => f.geometry.type == 'LineString') as GeoJsonLine[])
        .map(f => {
            let edges: Edge[] = [];
            if(!(f.properties.start.buildingCode == f.properties.end.buildingCode &&
                f.properties.start.floor == f.properties.end.floor)) {
                // start and end point at different buildingfloors
                const coords = f.geometry.coordinates.map(coord => new Coordinate(coord));
                let length = 0;
                for(let i = 0; i < coords.length-1; i++) {
                    length += getDistance(coords[i], coords[i+1], precision);
                }
                
                edges.push(new Edge(
                    new Location(coords[0], new BuildingFloor(f.properties.start)),
                    new Location(coords[coords.length-1], new BuildingFloor(f.properties.end)),
                    length, 0,
                    f.properties.type,
                    f.geometry.coordinates
                ));
            } else {// start and end point at same buildingfloor
                for(let i = 0; i < f.geometry.coordinates.length-1; i++) {
                    const start = new Coordinate(f.geometry.coordinates[i]);
                    const end = new Coordinate(f.geometry.coordinates[i+1]);
                    edges.push(new Edge(
                        new Location(start, new BuildingFloor(f.properties.start)),
                        new Location(end, new BuildingFloor(f.properties.end)),
                        getDistance(start, end, precision), 0,
                        f.properties.type,
                        f.geometry.coordinates.slice(i, i+2)
                    ));
                }
            }
            return edges;
        }).flat()
        .forEach(edge => this._addBidirectionalEdge(edge));

        // add 'open' and 'door' as edges
        (geoJson.features.filter(f => f.properties.type == 'open' || f.properties.type == 'door') as GeoJsonDoorOrOpen[])
        .forEach(f => {
            const coord = new Coordinate(f.geometry.coordinates);
            this._addBidirectionalEdge(new Edge(
                new Location(coord, new BuildingFloor(f.properties.start)),
                new Location(coord, new BuildingFloor(f.properties.end)),
                0, 0,
                f.properties.type,
                [f.geometry.coordinates]
            ));
        });

        // add 'stairs', include all n*(n-1)/2 pairs as edges
        (geoJson.features.filter(f => f.properties.type == 'stairs') as GeoJsonStairs[])
        .forEach(f => {
            const coord = new Coordinate(f.geometry.coordinates);
            const buildingFloors = (f.properties.connections ?? []).map(connection => new BuildingFloor(connection));
            for(let i = 0; i < buildingFloors.length; i++) {
                for(let j = i+1; j < buildingFloors.length; j++) {
                    this._addBidirectionalEdge(new Edge(
                        new Location(coord, buildingFloors[i]),
                        new Location(coord, buildingFloors[j]),
                        0, f.properties.connections[j].level - f.properties.connections[i].level,
                        f.properties.type,
                        [f.geometry.coordinates]
                    ));
                }
            }
        });
    }

    private _addBidirectionalEdge(edge: Edge) {
        const startStr = edge.start.toString();
        const endStr = edge.end.toString();
        if(this._map.get(startStr) == undefined) this._map.set(startStr, []);
        this._map.get(startStr)?.push(edge);
        if(this._map.get(endStr) == undefined) this._map.set(endStr, []);
        this._map.get(endStr)?.push(new Edge(edge.end, edge.start, edge.length, -edge.floorChange, edge.type, edge.coordinates.toReversed()));
    }

    get(location: Location): Edge[] {
        return this._map.get(location.toString()) ?? [];
    }
};

export class GraphLocation {
    readonly location: Location;
    /**
     * the line path from prevLocation to location, as geoJSON
     **/
    readonly path: [number, number][];
    readonly prevLocation: GraphLocation | null;
    /**
     * type of path to get from prevLocation to location
     **/
    readonly travelMode: string | null;
    /**
     * total distance travelled
     **/
    readonly distance: number;
    /**
     * total time elapsed in seconds
     */
    readonly time: number;
    /**
     * num floors to go up/down to get from prevLocation to location (a signed integer)
     **/
    readonly floorChange: number;
    /**
     * total number of floors ascended
     **/
    readonly floorsAscended: number;
    /**
     * total number of floors descended (a nonnegative integer)
     **/
    readonly floorsDescended: number;

    constructor(loc: Location, path: [number, number][],
        prevLoc = null as GraphLocation | null,
        travelMode = null as string | null,
        dist = 0, time = 0, floorChange = 0, floorsAsc = 0, floorsDesc = 0) {
        this.location = loc;
        this.path = path;
        this.prevLocation = prevLoc;
        this.travelMode = travelMode;
        this.distance = dist;
        this.time = time;
        this.floorChange = floorChange;
        this.floorsAscended = floorsAsc;
        this.floorsDescended = floorsDesc;
    }
};

export class Route {
    readonly graphLocations: GraphLocation[];

    constructor(endLocation: GraphLocation) {
        const arr1: GraphLocation[] = [];
        let curr: GraphLocation | null = endLocation;
        while(curr != null) {
            arr1.push(curr);
            curr = curr.prevLocation;
        }
        arr1.reverse();
        const arr2: GraphLocation[] = [];
        // merge paths that start and end at the same building and floor (includes outside pathways as well)
        for(let i = 0; i < arr1.length; i++) {
            const prevprev = arr2.at(-2);
            const prev = arr2.at(-1);
            const curr = arr1[i];
            if(prevprev && prev && prevprev.location.buildingFloor.equals(prev.location.buildingFloor) &&
                prev.location.buildingFloor.equals(curr.location.buildingFloor) && prev.travelMode == curr.travelMode) {
                const newLoc = new GraphLocation(curr.location, prev.path.concat(curr.path.slice(1)),
                prev.prevLocation, curr.travelMode, curr.distance, curr.time,
                curr.floorChange, curr.floorsAscended, curr.floorsDescended);
                arr2.pop();
                arr2.push(newLoc);
            } else arr2.push(curr);
        }

        this.graphLocations = [];
        // merge outdoor segments: [door(A, outside), walkway(outside, outside), door(outside, B)] => [walkway(A, B)]
        for(let i = 0; i < arr2.length; i++) {
            const curr = arr2[i];
            if(curr.travelMode == 'door' && curr.location.buildingFloor.buildingCode == 'OUT' && curr.location.buildingFloor.floor == '0') {
                console.assert(i+2 < arr2.length);
                const next = arr2[i+1];
                console.assert(next.travelMode == 'walkway');
                const nextNext = arr2[i+2];
                console.assert(nextNext.travelMode == 'door');
                this.graphLocations.push(new GraphLocation(
                    nextNext.location, next.path.concat(nextNext.path.slice(1)),
                    next.prevLocation, 'walkway', nextNext.distance, nextNext.time,
                    nextNext.floorChange, nextNext.floorsAscended, nextNext.floorsDescended
                ));
                i += 2;
            } else this.graphLocations.push(curr);
        }
    }

    getDirections() {
        const directions: string[] = [];
        for(let i = 1; i < this.graphLocations.length; i++) {
            const loc = this.graphLocations[i];
            const endBuilding = loc.location.buildingFloor; // the building at the end of this segment
            let str = '';
            if(loc.travelMode == 'open') {
                str = `Continue into ${endBuilding.toDirectionString()}`;
            } else if(loc.travelMode == 'door') {
                str = `Go through the door to ${endBuilding.toDirectionString()}`;
            } else if(loc.travelMode == 'stairs') {
                console.assert(loc.floorChange != 0);
                str = `Go ${loc.floorChange > 0 ? '⬆️' : '⬇️'} ${Math.abs(loc.floorChange)} floor${Math.abs(loc.floorChange) == 1 ? '' : 's'} to ${endBuilding.toDirectionString()}`;
            } else if(loc.travelMode == 'hallway') {
                str = `Take the ${loc.travelMode} on ${endBuilding.toDirectionString()}`;
            } else if(loc.travelMode == 'walkway') {
                str = `Go outside and walk to ${endBuilding.toDirectionString()}`;
            } else {
                str = `Take the ${loc.travelMode} to ${endBuilding.toDirectionString()}`;
            }
            directions.push(str);
        }
        return directions;
    }
};

export class Dijkstra {
    /**
     * Walking speed in m/s
     */
    static readonly WALKING_SPEED = 1.25;
    /**
     * Time to ascend a floor in seconds
     */
    static readonly FLOOR_ASCEND_SPEED = 14;
    /**
     * Time to descend a floor in seconds
     */
    static readonly FLOOR_DESCEND_SPEED = 14;

    static readonly COMPARE_BY_DISTANCE: ICompare<GraphLocation> = (a: GraphLocation, b: GraphLocation) => {
        return (a.distance < b.distance ? -1 : 1);
    }

    static readonly COMPARE_BY_TIME: ICompare<GraphLocation> = (a: GraphLocation, b: GraphLocation) => {
        return (a.time < b.time ? -1 : 1);
    }

    private readonly _dis: Map<String, number>;
    readonly adjList: AdjacencyList;

    constructor(adjList: AdjacencyList) {
        this._dis = new Map();
        this.adjList = adjList;
    }

    /**
     * Returns a Route object representing the route found. Returns null if no route is found.
     * If start and end are equal, a Route is returned with a single GraphLocation.
     */
    calculateRoute(start: Location, end: Location,
        comparator = Dijkstra.COMPARE_BY_TIME as ICompare<GraphLocation>): Route | null {
        const pq = new PriorityQueue<GraphLocation>(comparator);
        this._dis.clear();
        pq.push(new GraphLocation(start, [start.coordinate.toArray()]));
        this._setDistance(start, 0);
        while(!pq.isEmpty()) {
            const curr = pq.pop();
            if(curr.location.equals(end)) return new Route(curr);
            this.adjList.get(curr.location).forEach(edge => {
                if(curr.distance + edge.length < this._getDistance(edge.end)) {
                    pq.push(new GraphLocation(
                        edge.end, edge.coordinates, curr, edge.type,
                        curr.distance + edge.length,
                        curr.time + edge.length/Dijkstra.WALKING_SPEED + Math.abs(edge.floorChange)*(edge.floorChange > 0 ? Dijkstra.FLOOR_ASCEND_SPEED : Dijkstra.FLOOR_DESCEND_SPEED),
                        edge.floorChange,
                        curr.floorsAscended+Math.max(edge.floorChange, 0),
                        curr.floorsDescended-Math.min(edge.floorChange, 0)
                    ));
                    this._setDistance(edge.end, curr.distance + edge.length);
                }
            });
        }
        return null;
    }

    private _getDistance(location: Location): number {
        return this._dis.get(location.toString()) ?? Infinity;
    }

    private _setDistance(location: Location, distance: number) {
        this._dis.set(location.toString(), distance);
    }
};
