import { Coordinate, BuildingFloor, Location } from './algorithm/types';
import buildings from './geojson/buildings.json';

export const locationOptions = buildings.features.map(building => {
    return {
        value: new Location(
            new Coordinate(building.geometry.coordinates as [number, number]),
            new BuildingFloor(building.properties.building)
        ),
        label: building.properties.building.buildingCode
    }
});

export const floorOptions = [
    { value: 1, label: '1st Floor' },
    { value: 2, label: '2nd Floor' },
    { value: 3, label: '3rd Floor' }
]
