import { PriorityQueue, ICompare } from '@datastructures-js/priority-queue';
import { getDistance } from 'geolib';
const precision = 0.01;

import { Coordinate, BuildingFloor, Location, Edge, GeoJsonLine, GeoJsonStairs, GeoJsonDoorOrOpen, GeoJson } from './types';
export { Coordinate, BuildingFloor, Location, Edge };

//<-------------------- for dijkstra's algorithm ------------------------------>

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
                        f.geometry.coordinates
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
                        0, j-i,
                        f.properties.type,
                        [f.geometry.coordinates]
                    ));
                }
            }
        });

        console.log(this._map);
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
    readonly path: [number, number][];
    readonly prevLocation: GraphLocation | null;
    readonly travelMode: string | null;// type of path to get from prevLocation to location
    readonly distance: number;
    readonly floorChange: number;
    readonly floorsAscended: number;
    readonly floorsDescended: number;

    constructor(loc: Location, path: [number, number][],
        prevLoc = null as GraphLocation | null,
        travelMode = null as string | null,
        dist = 0, floorChange = 0, floorsAsc = 0, floorsDesc = 0) {
        this.location = loc;
        this.path = path;
        this.prevLocation = prevLoc;
        this.travelMode = travelMode;
        this.distance = dist;
        this.floorChange = floorChange;
        this.floorsAscended = floorsAsc;
        this.floorsDescended = floorsDesc;
    }
};

export class Route {
    readonly graphLocations: GraphLocation[];

    constructor(endLocation: GraphLocation) {
        this.graphLocations = [];
        let curr: GraphLocation | null = endLocation;
        while(curr != null) {
            this.graphLocations.push(curr);
            curr = curr.prevLocation;
        }
        this.graphLocations.reverse();
    }

    getDirections() {
        const res: string[] = [];
        for(let i = 1; i < this.graphLocations.length; i++) {
            let currLoc = this.graphLocations[i];
            const currSegmentEnd = currLoc.location;
            let str = '';
            if(currLoc.travelMode == 'open') {
                str = `Continue into ${currSegmentEnd.buildingFloor.toDirectionString()}`;
            } else if(currLoc.travelMode == 'stairs') {
                console.assert(currLoc.floorChange != 0);
                str = `Go ${currLoc.floorChange > 0 ? 'up' : 'down'} the stairs to ${currSegmentEnd.buildingFloor.toDirectionString()}`;
            } else if(currLoc.travelMode == 'hallway') {
                str = `Take the ${currLoc.travelMode} on ${currSegmentEnd.buildingFloor.toDirectionString()}`;
            } else {
                str = `Take the ${currLoc.travelMode} to ${currSegmentEnd.buildingFloor.toDirectionString()}`;
            }
            // str += '|'+
            res.push(str);
        }

        return res;
    }
};

export class Dijkstra {
    static compareByDistance: ICompare<GraphLocation> = (a: GraphLocation, b: GraphLocation) => {
        return (a.distance < b.distance ? -1 : 1);
    }
    private readonly _dis: Map<String, number>;
    readonly adjList: AdjacencyList;

    constructor(adjList: AdjacencyList) {
        this._dis = new Map();
        this.adjList = adjList;
    }

    calculateRoute(start: Location, end: Location,
        comparator = Dijkstra.compareByDistance as ICompare<GraphLocation>): Route | null {
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
                        edge.floorChange,
                        curr.floorsAscended,// TODO: implement floors asc/desc
                        curr.floorsDescended
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
