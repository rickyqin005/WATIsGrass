import { useEffect, useMemo } from 'react';
import { GeoJson, GeoJsonBuildingOutline, GeoJsonLine } from '../algorithm/types';
import formatPolyLine from '../map/formatPolyLine';
import formatPolygon from '../map/formatPolygon';

/**
 * Displays the base geoJson layer on the map
 */
export default function useBaseGeoJson(googleMap: any, geoJson: GeoJson, hasRoute: boolean) {
	const baseGeoJson = useMemo(() => {
		if(googleMap) {
			const lines = (geoJson.features.filter(f => f.geometry.type == 'LineString' && f.properties.type != 'walkway') as GeoJsonLine[])
			.map(feature => new google.maps.Polyline(formatPolyLine(feature.geometry.coordinates, feature.properties.type)));
			const polygons = (geoJson.features.filter(f => f.geometry.type == 'Polygon') as GeoJsonBuildingOutline[])
			.map(feature => new google.maps.Polygon(formatPolygon(feature.geometry.coordinates[0])));

			return (lines as any[]).concat(polygons);
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
