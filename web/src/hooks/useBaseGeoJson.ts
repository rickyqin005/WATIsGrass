import { useEffect, useMemo } from 'react';
import { GeoJson, GeoJsonLine } from '../algorithm/types';
import formatPolyLine from '../map/formatPolyLine';

/**
 * Displays the base geoJson layer on the map
 */
export default function useBaseGeoJson(googleMap: any, geoJson: GeoJson, hasRoute: boolean) {
	const baseGeoJson = useMemo(() => {
		if(googleMap) {
			return (geoJson.features.filter(f => f.geometry.type == 'LineString' && f.properties.type != 'walkway') as GeoJsonLine[])
			.map(feature => new google.maps.Polyline(formatPolyLine(feature.geometry.coordinates, feature.properties.type)));
		}
		return [];
	}, [googleMap]);

	useEffect(() => {
		baseGeoJson.forEach(feature => {
			feature.setOptions({ strokeOpacity: (hasRoute ? 0.25 : 1)});
			feature.setMap(googleMap);
		});
	}, [baseGeoJson, hasRoute]);
}
