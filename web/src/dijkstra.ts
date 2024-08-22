import { PriorityQueue, ICompare } from '@datastructures-js/priority-queue';
import geoJson from './UW_paths.json';
import { getDistance } from 'geolib';
const precision = 0.01;

export interface Coordinate {
    latitude: number,
    longitude: number
}
// arr: [lng, lat]
export function toCoordinate(arr: [number, number]): Coordinate {
    return { latitude: arr[1], longitude: arr[0] };
}

export interface BuildingFloor {
    buildingCode: string,
    floor: string
};
export interface Edge {
    start: Coordinate,
    end: Coordinate,
    length: number,
    startFloor: BuildingFloor,
    endFloor: BuildingFloor
};
export interface Point {
    coordinate: Coordinate,
    connections: BuildingFloor[]// ordered from lowest to highest
};
export interface Graph {
    edges: Edge[],
    points: Point[]
};

// for dijkstra's algorithm
interface Node {
    location: Coordinate,
    distance: number,
    floorsAscended: number,
    floorsDescended: number,
}

const compareNodes: ICompare<Node> = (a: Node, b: Node) => {
    return (a.distance < b.distance ? -1 : 1);
}

export default function calculateRoute(start: Coordinate, end: Coordinate) {
    const NodesQueue = new PriorityQueue<Node>(compareNodes);
    NodesQueue.push({
        location: start,
        distance: 0,
        floorsAscended: 0,
        floorsDescended: 0
    });
    while(!NodesQueue.isEmpty()) {
        NodesQueue.pop();
    }
}

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
        edges.push({
            start: coords[0],
            end: coords[coords.length-1],
            length: length,
            startFloor: f.properties.start as BuildingFloor,
            endFloor: f.properties.end as BuildingFloor
        });
    } else {
        for(let i = 0; i < f.geometry.coordinates.length-1; i++) {
            const start = toCoordinate(f.geometry.coordinates[i] as [number, number]);
            const end = toCoordinate(f.geometry.coordinates[i+1] as [number, number]);
            edges.push({
                start: start,
                end: end,
                length: getDistance(start, end, precision),
                startFloor: f.properties.start as BuildingFloor,
                endFloor: f.properties.end as BuildingFloor
            });
        }
    }
    return edges;
}).flat();
const adjList: Map<Coordinate, Coordinate[]> = new Map(); 

console.log(edges);
