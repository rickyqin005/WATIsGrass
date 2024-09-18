import geoJson from '../geojson/paths.json';

/**
 * Displays the base geoJson layer on the map
 */
export default function displayBaseGeoJson(map) {
	const lines = {
		...geoJson,
		features: geoJson.features.filter(f => f.geometry.type == 'LineString')
	};
	map.data.addGeoJson(lines);
	map.data.setStyle(feature => {
		const type = feature.getProperty('type');
		let strokeColor = 'black';
		if (type == 'bridge') strokeColor = 'green';
		if (type == 'hallway') strokeColor = '#668cff';
		if (type == 'tunnel') strokeColor = '#86592d';
		return {
			strokeColor: strokeColor,
			strokeWeight: 4
		};
	});
}
