import React from 'react';
import { useState } from 'react';
import Select, { SingleValue } from 'react-select';

import './App.css';

import geoJson from './geojson/paths.json';
import { locationOptions, floorOptions } from './locations';

import { Dijkstra, AdjacencyList, Location, Route } from './algorithm/dijkstra';
import loadMap from './map/loadMap';

type OptionType = {
	value: Location;
	label: string;
};

function App() {
	const UWMap = React.useMemo(() => new Dijkstra(new AdjacencyList(geoJson)), []);

	const [googleMap, setGoogleMap] = useState(null);
	const [start, setStart] = useState<SingleValue<OptionType>>(null);
	const [startFloor, setStartFloor] = useState<SingleValue<OptionType>>(null);
	const [end, setEnd] = useState<SingleValue<OptionType>>(null);
	const [endFloor, setEndFloor] = useState<SingleValue<OptionType>>(null);
	const [routeClear, setRouteClear] = useState<() => void>(() => () => {})

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (googleMap && start && end) {
			console.log(`Start: ${start.value}, End: ${end.value}`);
			const route = UWMap.calculateRoute(start.value, end.value);
			console.log(route?.graphLocations);
			console.log(route?.getDirections());
			routeClear();
			setRouteClear(displayRoute(googleMap, route));
		}
	};

	// loads map
	React.useEffect(() => {
		loadMap().then(map => {
			console.log('loaded map');
			setGoogleMap(map);
			displayAllGeoJson(map);
		});
	}, []);

	return (
		<div className="App flex flex-col items-center justify-center h-screen">
			<div id="header" className="h-[10%] flex items-center justify-center">
				<h1 className="text-3xl font-bold">WATIsGrass: UW Tunnels</h1>
			</div>
			<div id="input" className="h-[10%] mb-10">
				<form className="flex items-center space-x-4 p-4 bg-gray-100 rounded shadow-md w-full max-w-2xl" onSubmit={e => handleSubmit(e)}>
					<div className="flex flex-col">
						<label htmlFor="start-building" className="mb-1 text-gray-700 font-semibold">
							Start Building
						</label>
						<Select
							id="start-building"
							name="start-building"
							options={locationOptions} // Use the imported options
							className="react-select-container"
							classNamePrefix="react-select"
							value={start}
							onChange={newVal => setStart(newVal)}
						/>
					</div>
					<div className="flex flex-col">
						<label htmlFor="start-floor" className="mb-1 text-gray-700 font-semibold">
							Start Floor
						</label>
						<Select
							id="start-building"
							name="start-building"
							options={floorOptions} // Use the imported options
							className="react-select-container"
							classNamePrefix="react-select"
							value={startFloor}
							onChange={newVal => setStartFloor(newVal)}
						/>
					</div>
					<div className="flex flex-col">
						<label htmlFor="end-building" className="mb-1 text-gray-700 font-semibold">
							End Building
						</label>
						<Select
							id="end-building"
							name="end-building"
							options={locationOptions} // Use the imported options
							className="react-select-container"
							classNamePrefix="react-select"
							value={end}
							onChange={newVal => setEnd(newVal)}
						/>
					</div>
					<div className="flex flex-col">
						<label htmlFor="end-floor" className="mb-1 text-gray-700 font-semibold">
							End Floor
						</label>
						<Select
							id="end-floor"
							name="end-floor"
							options={floorOptions} // Use the imported options
							className="react-select-container"
							classNamePrefix="react-select"
							value={endFloor}
							onChange={newVal => setEndFloor(newVal)}
						/>
					</div>
					<input
						type="submit"
						value="Let's Tunnel!"
						className="p-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 cursor-pointer disabled:opacity-50"
						disabled={!start || !startFloor || !end || !endFloor}
					/>
				</form>
			</div>
			<div id="map" className="h-[70%] w-[80%]"></div>
		</div>
	);
}

export default App;

function displayAllGeoJson(map) {
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

// returns a function to clear the route from the map
function displayRoute(googleMap, route: Route | null) {
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