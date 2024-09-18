import React from 'react';
import { useState } from 'react';
import Select, { SingleValue } from 'react-select';

import './App.css';

import geoJson from './geojson/paths.json';
import { getStartEndLocations, getBuildingFloorOptions, getBuildingOptions, getFloorOptions } from './locations';
import { Dijkstra, AdjacencyList, Location, Route, BuildingFloor } from './algorithm/dijkstra';
import loadMap from './map/loadMap';
import displayRoute from './map/displayRoute';
import displayBaseGeoJson from './map/displayBaseGeoJson';

type OptionType = {
	value: string;
	label: string;
};

function App() {

	const UWMap = React.useMemo(() => new Dijkstra(new AdjacencyList(geoJson)), []);
	const [googleMap, setGoogleMap] = useState(null);

	const startEndLocations = React.useMemo(getStartEndLocations, []);
	const buildingFloorOptions = React.useMemo(getBuildingFloorOptions, []);

	const [startBuilding, setStartBuilding] = useState<SingleValue<OptionType>>(null);
	const [startFloor, setStartFloor] = useState<SingleValue<OptionType>>(null);
	const [endBuilding, setEndBuilding] = useState<SingleValue<OptionType>>(null);
	const [endFloor, setEndFloor] = useState<SingleValue<OptionType>>(null);
	const buildingOptions = React.useMemo(getBuildingOptions(buildingFloorOptions), []);
	const startFloorOptions = React.useMemo(getFloorOptions(buildingFloorOptions, startBuilding), [startBuilding]);
	const endFloorOptions = React.useMemo(getFloorOptions(buildingFloorOptions, endBuilding), [endBuilding]);

	const [hasRoute, setHasRoute] = useState(false);
	const [route, setRoute] = useState<Route | null>(null);
	const [routeClear, setRouteClear] = useState<() => void>(() => () => {});

	React.useEffect(() => {
		console.log(route?.graphLocations);
		routeClear();
		displayRoute(googleMap, route).then(funct => setRouteClear(funct));
	}, [route]);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (googleMap && startBuilding && startFloor && endBuilding && endFloor) {
			const startBuildingFloor = new BuildingFloor({ buildingCode: startBuilding.value, floor: startFloor.value });
			const endBuildingFloor = new BuildingFloor({ buildingCode: endBuilding.value, floor: endFloor.value });
			console.log(`Start: ${startBuildingFloor.toString()}, End: ${endBuildingFloor.toString()}`);

			setRoute(UWMap.calculateRoute(startEndLocations.get(startBuildingFloor.toString()) as Location, 
				startEndLocations.get(endBuildingFloor.toString()) as Location));
			setHasRoute(true);
		}
	};

	// loads map
	React.useEffect(() => {
		loadMap().then(map => {
			console.log('loaded map');
			setGoogleMap(map);
			displayBaseGeoJson(map);
		});
	}, []);

	return (
		<div className="App flex flex-col items-center justify-center h-screen">

			<div id="map" className="relative z-0 flex h-[100%] w-[100%]"></div>

			<div id="header" className="absolute inset-y-[2%] h-[5%] z-10 flex items-center justify-center ">
				<h1 className="text-3xl font-bold p-1 bg-white/75 shadow-2xl rounded-3xl">
					WATIsGrass: UW Tunnels
				</h1>
			</div>

			<div id="input" className="absolute inset-y-[9%] h-[10%] z-10">
				<form className="flex items-center space-x-4 p-4 bg-gray-100 rounded shadow-md w-full max-w-2xl" onSubmit={e => handleSubmit(e)}>
					<div className="flex flex-col">
						<label htmlFor="start-building" className="mb-1 text-gray-700 font-semibold">
							Start Building
						</label>
						<Select
							id="start-building"
							name="start-building"
							options={buildingOptions}
							className="react-select-container"
							classNamePrefix="react-select"
							value={startBuilding}
							onChange={newVal => setStartBuilding(newVal)}
						/>
					</div>
					<div className="flex flex-col">
						<label htmlFor="start-floor" className="mb-1 text-gray-700 font-semibold">
							Start Floor
						</label>
						<Select
							id="start-floor"
							name="start-floor"
							options={startFloorOptions}
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
							options={buildingOptions}
							className="react-select-container"
							classNamePrefix="react-select"
							value={endBuilding}
							onChange={newVal => setEndBuilding(newVal)}
						/>
					</div>
					<div className="flex flex-col">
						<label htmlFor="end-floor" className="mb-1 text-gray-700 font-semibold">
							End Floor
						</label>
						<Select
							id="end-floor"
							name="end-floor"
							options={endFloorOptions}
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
						disabled={!startBuilding || !startFloor || !endBuilding || !endFloor}
					/>
				</form>
			</div>

			{hasRoute ?
				<div id="directions" className="absolute left-[2%] top-[30%] max-h-[65%] overflow-y-auto z-10 pl-10 pr-3 py-3 bg-gray-200/85 shadow-2xl">
					{route != null ? 
						<ol className="list-decimal ">
							{route.getDirections().map(str => <li className="text-left">{str}</li>)}
						</ol>
					: 'No routes found :('}
				</div>
			: ''}

			<div id="footer" className="absolute bottom-[2%] z-10 bg-white/75">Made by Ricky Qin and Manasva Katyal, check out the Github repo{' '}
				<a
					className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
					href="https://github.com/rickyqin005/WATIsGrass">here</a>!
			</div>
		</div>
	);
}

export default App;
