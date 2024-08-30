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

export const floorOptions = buildings.features.reduce((acc: { [key: string]: any }, building) => {
    const floors = ["1", "2", "3"]; // HARDCODED FLOOR UNTIL WE CAN GET IT FROM THE GEOJSON
    const buildingCode = building.properties.building.buildingCode;


    acc[buildingCode] = floors.map(floor => {
        return {
            value: floor,
            label: `Floor ${floor}`
        }
    });

    return acc;
}, {});
