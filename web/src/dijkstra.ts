import { PriorityQueue, ICompare } from '@datastructures-js/priority-queue';
import geoJson from './UW_paths.json';
import { getDistance } from 'geolib';
const precision = 0.01;


export class Coordinate {
    latitude: number;
    longitude: number;

    constructor(lat: number, lng: number) {
        this.latitude = lat;
        this.longitude = lng;
    }
};
function toCoordinate(arr: [number, number]): Coordinate {
    return new Coordinate(arr[1], arr[0]);
}

export class BuildingFloor {
    buildingCode: string;
    floor: string;

    constructor(buildingCode: string, floor: string) {
        this.buildingCode = buildingCode;
        this.floor = floor;
    }
};

export class Location {
    coordinate: Coordinate;
    buildingFloor: BuildingFloor;

    constructor(coordinate: Coordinate, buildingFloor: BuildingFloor) {
        this.coordinate = coordinate;
        this.buildingFloor = buildingFloor;
    }

    toString(): string {
        return `${this.coordinate.latitude}|${this.coordinate.longitude}|` +
            `${this.buildingFloor.buildingCode}|${this.buildingFloor.floor}`;
    }
};

export class Edge {
    start: Location;
    end: Location;
    length: number;

    constructor(start: Location, end: Location, length: number) {
        this.start = start;
        this.end = end;
        this.length = length;
    }
};

export class TransferPoint {
    coordinate: Coordinate;
    connections: BuildingFloor[]; // ordered from lowest to highest

    constructor(coordinate: Coordinate, connections: BuildingFloor[]) {
        this.coordinate = coordinate;
        this.connections = connections;
    }
};

//<-------------------- for dijkstra's algorithm ------------------------------>

export class AdjacencyList {
    _map: Map<String, Location[]>;

    constructor() {
        this._map = new Map();
    }

    addBidirectionalEdge(edge: Edge) {
        const startStr = edge.start.toString();
        const endStr = edge.end.toString();
        if(this._map.get(startStr) == undefined) this._map.set(startStr, []);
        this._map.get(startStr)?.push(edge.end);
        if(this._map.get(endStr) == undefined) this._map.set(endStr, []);
        this._map.get(endStr)?.push(edge.start);
    }
};

export class GraphLocation {
    location: Location;
    prevLocation: Location | null;
    travelMode: string | null;// type of path to get from prevLocation to location
    distance: number;
    floorsAscended: number;
    floorsDescended: number;

    constructor(loc: Location, prevLoc = null as Location | null, travelMode = null as string | null,
        dist = 0, floorsAsc = 0, floorsDesc = 0) {
        this.location = loc;
        this.prevLocation = prevLoc;
        this.travelMode = travelMode;
        this.distance = dist;
        this.floorsAscended = floorsAsc;
        this.floorsDescended = floorsDesc;
    }
};

const compareGraphLocations: ICompare<GraphLocation> = (a: GraphLocation, b: GraphLocation) => {
    return (a.distance < b.distance ? -1 : 1);
}

export default function calculateRoute(start: Location, end: Location) {
    const pq = new PriorityQueue<GraphLocation>(compareGraphLocations);
    pq.push(new GraphLocation(start));
    while(!pq.isEmpty()) {
        pq.pop();
    }
}

const adjList = new AdjacencyList();

const transferPoints = geoJson.features
.filter(f => f.geometry.type == 'Point' && f.properties.type == 'stairs')
.map(f => new TransferPoint(
    toCoordinate(f.geometry.coordinates as [number, number]), f.properties.connections as BuildingFloor[]
));

// add lines to adj list
const edges = geoJson.features.filter(f => f.geometry.type == 'LineString')
.map(f => {
    let edges: Edge[] = [];
    if(!(f.properties.start?.buildingCode == f.properties.end?.buildingCode &&
        f.properties.start?.floor == f.properties.end?.floor)) {
        const coords = f.geometry.coordinates.map(coord => toCoordinate(coord as [number, number]));
        let length = 0;
        for(let i = 0; i < coords.length-1; i++) {
            length += getDistance(coords[i], coords[i+1], precision);
        }
        
        edges.push(new Edge(
            new Location(coords[0], f.properties.start as BuildingFloor),
            new Location(coords[coords.length-1], f.properties.end as BuildingFloor),
            length
        ));
    } else {
        for(let i = 0; i < f.geometry.coordinates.length-1; i++) {
            const start = toCoordinate(f.geometry.coordinates[i] as [number, number]);
            const end = toCoordinate(f.geometry.coordinates[i+1] as [number, number]);
            edges.push(new Edge(
                new Location(start, f.properties.start as BuildingFloor),
                new Location(end, f.properties.end as BuildingFloor),
                getDistance(start, end, precision)
            ));
        }
    }
    return edges;
}).flat();
edges.forEach(edge => adjList.addBidirectionalEdge(edge));

// add 'open' and 'door' to adj list
geoJson.features.filter(f => f.properties.type == 'open' || f.properties.type == 'door')
.forEach(f => {
    const coord = toCoordinate(f.geometry.coordinates as [number, number]);
    adjList.addBidirectionalEdge(new Edge(
        new Location(coord, f.properties.start as BuildingFloor),
        new Location(coord, f.properties.end as BuildingFloor),
        0
    ));
})

console.log(transferPoints);
console.log(edges);
console.log(adjList);
