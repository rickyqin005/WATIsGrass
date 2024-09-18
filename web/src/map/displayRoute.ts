import { Route } from "../algorithm/dijkstra";

/**
 * returns a function to clear the route from the map
 */
export default function displayRoute(googleMap, route: Route | null) {
	if(route != null) {
		const lines = route.graphLocations.filter((loc, idx) => idx != 0)
		.map(loc => new google.maps.Polyline({
			path: loc.path.map(point => { return { lat: point[1], lng: point[0] } }) as any[],
			strokeColor: 'red',
			strokeWeight: 6,
			zIndex: 1
		}));
		lines.forEach(line => line.setMap(googleMap));

		return () => () => lines.forEach(line => line.setMap(null));
	}
	return () => () => {};
}
