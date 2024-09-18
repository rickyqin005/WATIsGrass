import { Route } from "../algorithm/dijkstra";

/**
 * Returns a function to clear the route from the map
 */
export default async function displayRoute(googleMap, route: Route | null) {
	if(route != null) {
		const lines = route.graphLocations.filter((loc, idx) => idx != 0)
		.map(loc => new google.maps.Polyline({
			path: loc.path.map(point => { return { lat: point[1], lng: point[0] } }) as any[],
			strokeColor: 'red',
			strokeWeight: 6,
			zIndex: 1
		}));
		lines.forEach(line => line.setMap(googleMap));

        const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
        const startMarker = new AdvancedMarkerElement({
            map: googleMap,
            position: route.graphLocations[0].location.coordinate.toGoogleMapsCoordinate()
        });
        const endMarker = new AdvancedMarkerElement({
            map: googleMap,
            position: route.graphLocations.at(-1)?.location.coordinate.toGoogleMapsCoordinate(),
            content: new PinElement({
                background: '#009933',
                borderColor: '#196619',
                glyphColor: '#196619'
            }).element
        });

		return () => () => {
            lines.forEach(line => line.setMap(null));
            startMarker.map = null;
            endMarker.map = null;
        }
	}
	return () => () => {};
}
