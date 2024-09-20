import { Route } from "../algorithm/dijkstra";
import formatPolyLine from "./formatPolyLine";

/**
 * Returns a function to clear the route from the map
 */
export default function displayRoute(googleMap, route: Route | null) {
	if(route != null) {
		const lines = route.graphLocations.filter((loc, idx) => idx != 0)
		.map(loc => new google.maps.Polyline({
			...formatPolyLine(loc.path, loc.travelMode ?? ""),
			strokeWeight: 6,
			zIndex: 1
		}));
		lines.forEach(line => line.setMap(googleMap));

		return () => () => lines.forEach(line => line.setMap(null));
	}
	return () => () => {};
}
