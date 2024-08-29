import React from 'react';
import { useState } from 'react';
import Select, { SingleValue } from 'react-select';

import './App.css';

import geoJson from './UW_paths.json';
import { locationOptions } from './locations';

import { Dijkstra, AdjacencyList, Coordinate, BuildingFloor, Location } from './dijkstra';

const route = new Dijkstra(new AdjacencyList(geoJson))
	.calculateRoute(new Location(
		new Coordinate([-80.538799, 43.473206]),
		new BuildingFloor({ buildingCode: 'E6', floor: '3' })),
		new Location(new Coordinate([-80.545701, 43.471602]),
			new BuildingFloor({ buildingCode: 'SLC', floor: '1' })));
console.log(route?.getGraphLocations());
console.log(route?.getDirections());

type OptionType = {
	value: string;
	label: string;
};

function App() {
	const [start, setStart] = useState<SingleValue<OptionType>>(null);
	const [end, setEnd] = useState<SingleValue<OptionType>>(null);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (start && end) console.log(`Start: ${start.value}, End: ${end.value}`);
	};

	React.useEffect(() => {
		(g => { var h: Promise<unknown>, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({
			key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
			v: "weekly",
			// Use the 'v' parameter to indicate the version to use (weekly, beta, alpha, etc.).
			// Add other bootstrap parameters as needed, using camel case.
		});

		let map: google.maps.Map;
		async function initMap(): Promise<void> {
			const { Map } = await google.maps.importLibrary("maps");
			map = new Map(document.getElementById("map") as HTMLElement, {
				center: { lat: 43.4705, lng: -80.542 },
				zoom: 17,
				mapId: 'map1'
			});

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

			route?.getGraphLocations().forEach(loc => {
				if (loc.prevLocation != null) {
					const line = new google.maps.Polyline({
						path: loc.path.map(point => { return { lat: point[1], lng: point[0] } }) as any[],
						strokeColor: 'red',
						strokeWeight: 6,
						zIndex: 1
					});
					line.setMap(map);
				}
			});
		}

		initMap()
			.then(() => console.log('loaded map'));

	}, []);

	return (
		<div className="App flex flex-col items-center justify-center h-screen">
			<div id="header" className="h-[10%] flex items-center justify-center">
				<h1 className="text-3xl font-bold">WATIsGrass: UW Tunnels</h1>
			</div>
			<div id="input" className="h-[10%] mb-10">
				<form className="flex items-center space-x-4 p-4 bg-gray-100 rounded shadow-md w-full max-w-2xl" onSubmit={e => handleSubmit(e)}>
					<div className="flex flex-col">
						<label htmlFor="start" className="mb-1 text-gray-700 font-semibold">
							Start
						</label>
						<Select
							id="start"
							name="start"
							options={locationOptions} // Use the imported options
							className="react-select-container"
							classNamePrefix="react-select"
							value={start}
							onChange={setStart}
						/>
					</div>
					<div className="flex flex-col">
						<label htmlFor="end" className="mb-1 text-gray-700 font-semibold">
							End
						</label>
						<Select
							id="end"
							name="end"
							options={locationOptions} // Use the imported options
							className="react-select-container"
							classNamePrefix="react-select"
							value={end}
							onChange={setEnd}
						/>
					</div>
					<input
						type="submit"
						value="Let's Tunnel!"
						className="p-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 cursor-pointer"
						disabled={!start || !end}
					/>
				</form>
			</div>
			<div id="map" className="h-[70%] w-[80%]"></div>
		</div>
	);
}

export default App;
