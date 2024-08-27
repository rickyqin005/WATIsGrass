import { PriorityQueue, ICompare } from '@datastructures-js/priority-queue';
import { getDistance } from 'geolib';
const precision = 0.01;


export class Coordinate {
    readonly latitude: number;
    readonly longitude: number;

    constructor(arr: [number, number]) {
        this.latitude = arr[1];
        this.longitude = arr[0];
    }

    equals(other: Coordinate) {
        return this.latitude == other.latitude && this.longitude == other.longitude;
    }
};

export class BuildingFloor {
    readonly buildingCode: string;
    readonly floor: string;

    constructor({ buildingCode, floor }: { buildingCode: string, floor: string }) {
        this.buildingCode = buildingCode;
        this.floor = floor;
    }

    equals(other: BuildingFloor) {
        return this.buildingCode == other.buildingCode && this.floor == other.floor;
    }

    toDirectionString() {
        return `${this.buildingCode} floor ${this.floor}`;
    }
};

export class Location {
    readonly coordinate: Coordinate;
    readonly buildingFloor: BuildingFloor;

    constructor(coordinate: Coordinate, buildingFloor: BuildingFloor) {
        this.coordinate = coordinate;
        this.buildingFloor = buildingFloor;
    }

    toString(): string {
        return `${this.coordinate.latitude}|${this.coordinate.longitude}|` +
            `${this.buildingFloor.buildingCode}|${this.buildingFloor.floor}`;
    }

    equals(other: Location) {
        return this.coordinate.equals(other.coordinate) && this.buildingFloor.equals(other.buildingFloor);
    }
};

export class Edge {
    readonly start: Location;
    readonly end: Location;
    readonly length: number;
    readonly floorChange: number;// number of floors up/down
    readonly type: string;

    constructor(start: Location, end: Location, length: number, floorChange: number, type: string) {
        this.start = start;
        this.end = end;
        this.length = length;
        this.floorChange = floorChange;
        this.type = type;
    }
};

//<-------------------- for dijkstra's algorithm ------------------------------>

export class AdjacencyList {
    private readonly _geoJson;
    private readonly _map: Map<String, Edge[]>;

    constructor(geoJson) {
        this._geoJson = geoJson;
        this._map = new Map();

        // add lines as edges
        geoJson.features.filter(f => f.geometry.type == 'LineString')
        .map(f => {
            let edges: Edge[] = [];
            // check if start and end point is at different buildingfloors
            if(!(f.properties.start?.buildingCode == f.properties.end?.buildingCode &&
                f.properties.start?.floor == f.properties.end?.floor)) {
                const coords = f.geometry.coordinates.map(coord => new Coordinate(coord as [number, number]));
                let length = 0;
                for(let i = 0; i < coords.length-1; i++) {
                    length += getDistance(coords[i], coords[i+1], precision);
                }
                
                edges.push(new Edge(
                    new Location(coords[0], new BuildingFloor(f.properties.start as BuildingFloor)),
                    new Location(coords[coords.length-1], new BuildingFloor(f.properties.end as BuildingFloor)),
                    length, 0,
                    f.properties.type
                ));
            } else {
                for(let i = 0; i < f.geometry.coordinates.length-1; i++) {
                    const start = new Coordinate(f.geometry.coordinates[i] as [number, number]);
                    const end = new Coordinate(f.geometry.coordinates[i+1] as [number, number]);
                    edges.push(new Edge(
                        new Location(start, new BuildingFloor(f.properties.start as BuildingFloor)),
                        new Location(end, new BuildingFloor(f.properties.end as BuildingFloor)),
                        getDistance(start, end, precision), 0,
                        f.properties.type
                    ));
                }
            }
            return edges;
        }).flat()
        .forEach(edge => this._addBidirectionalEdge(edge));

        // add 'open' and 'door' as edges
        geoJson.features.filter(f => f.properties.type == 'open' || f.properties.type == 'door')
        .forEach(f => {
            const coord = new Coordinate(f.geometry.coordinates as [number, number]);
            this._addBidirectionalEdge(new Edge(
                new Location(coord, new BuildingFloor(f.properties.start as BuildingFloor)),
                new Location(coord, new BuildingFloor(f.properties.end as BuildingFloor)),
                0, 0,
                f.properties.type
            ));
        })

        // add 'stairs' (add all n*(n-1)/2 combinations as edges)
        geoJson.features
        .filter(f => f.geometry.type == 'Point' && f.properties.type == 'stairs')
        .forEach(f => {
            const coord = new Coordinate(f.geometry.coordinates as [number, number]);
            const buildingFloors = (f.properties.connections ?? []).map(connection => new BuildingFloor(connection));
            for(let i = 0; i < buildingFloors.length; i++) {
                for(let j = i+1; j < buildingFloors.length; j++) {
                    this._addBidirectionalEdge(new Edge(
                        new Location(coord, buildingFloors[i]),
                        new Location(coord, buildingFloors[j]),
                        0, j-i,
                        f.properties.type
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
        this._map.get(endStr)?.push(new Edge(edge.end, edge.start, edge.length, -edge.floorChange, edge.type));
    }

    get(location: Location): Edge[] {
        return this._map.get(location.toString()) ?? [];
    }
};

export class GraphLocation {
    readonly location: Location;
    readonly prevLocation: GraphLocation | null;
    readonly travelMode: string | null;// type of path to get from prevLocation to location
    readonly distance: number;
    readonly floorChange: number;
    readonly floorsAscended: number;
    readonly floorsDescended: number;

    constructor(loc: Location, prevLoc = null as GraphLocation | null, travelMode = null as string | null,
        dist = 0, floorChange = 0, floorsAsc = 0, floorsDesc = 0) {
        this.location = loc;
        this.prevLocation = prevLoc;
        this.travelMode = travelMode;
        this.distance = dist;
        this.floorChange = floorChange;
        this.floorsAscended = floorsAsc;
        this.floorsDescended = floorsDesc;
    }
};

export class Route {
    readonly endLocation: GraphLocation;

    constructor(endLoc: GraphLocation) {
        this.endLocation = endLoc;
    }

    getDirections() {
        const res: string[] = [];
        let currLoc: GraphLocation | null = this.endLocation;
        while(currLoc != null && currLoc.prevLocation != null) {
            const currSegmentStart = currLoc.prevLocation?.location;
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
            res.push(str);
            currLoc = currLoc.prevLocation;
        }

        return res.reverse();
    }
};

const compareByDistance: ICompare<GraphLocation> = (a: GraphLocation, b: GraphLocation) => {
    return (a.distance < b.distance ? -1 : 1);
}

export class Dijkstra {
    private readonly _dis: Map<String, number>;
    readonly adjList: AdjacencyList;

    constructor(adjList: AdjacencyList, ) {
        this._dis = new Map();
        this.adjList = adjList;
    }

    calculateRoute(start: Location, end: Location,
        comparator = compareByDistance as ICompare<GraphLocation>): Route | null {
        const pq = new PriorityQueue<GraphLocation>(comparator);
        pq.push(new GraphLocation(start));
        this._setDistance(start, 0);
        while(!pq.isEmpty()) {
            const curr = pq.pop();
            if(curr.location.equals(end)) return new Route(curr);
            this.adjList.get(curr.location).forEach(edge => {
                if(curr.distance + edge.length < this._getDistance(edge.end)) {
                    pq.push(new GraphLocation(
                        edge.end, curr, edge.type,
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
