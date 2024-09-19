import { SingleValue } from "react-select";
import { OptionType } from "./locations";
import { BuildingFloor, Location } from "../algorithm/types";
import { GoogleMapsLibrary } from "./GoogleMapsLibrary";
import { Route } from "../algorithm/dijkstra";

export default function updateLocation(startBuilding: SingleValue<OptionType>, startFloor: SingleValue<OptionType>,
    startEndLocations: Map<string, Location>, startLocationMarker: google.maps.marker.AdvancedMarkerElement | null,
    setStartLocationMarker: React.Dispatch<React.SetStateAction<google.maps.marker.AdvancedMarkerElement | null>>,
    route: Route | null, setRoute: React.Dispatch<React.SetStateAction<Route | null>>,
    routeClear: () => void, setRouteClear: React.Dispatch<React.SetStateAction<() => void>>,
    setHasRoute: React.Dispatch<React.SetStateAction<boolean>>,
    googleMap: any, Markers: GoogleMapsLibrary | null,
    markerContent = undefined as any
) {
    return () => {
        // clear route if it currently exists
        if(route) {
            routeClear();
            setRouteClear(() => () => {});
            setRoute(null);
            setHasRoute(false);
        }

        let newLoc: Location | null = null;
        if(startBuilding && startFloor) {
			const startBuildingFloor = new BuildingFloor({ buildingCode: startBuilding.value, floor: startFloor.value });
			newLoc = startEndLocations.get(startBuildingFloor.toString()) ?? null;
        }

        if(!newLoc) {
            if(startLocationMarker) {
                startLocationMarker.map = null;
                setStartLocationMarker(null);
            }
        } else {
            // update start location marker
            if(googleMap && Markers) {
                if(!startLocationMarker) {
                    setStartLocationMarker(new Markers.AdvancedMarkerElement({
                        map: googleMap,
                        position: newLoc.coordinate.toGoogleMapsCoordinate(),
                        content: markerContent
                    }));
                } else startLocationMarker.position = newLoc.coordinate.toGoogleMapsCoordinate();
            }
        }
        return newLoc;
    };
}