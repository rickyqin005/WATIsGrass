import { useState, useEffect, useMemo } from 'react';
import Select, { SingleValue } from 'react-select';

import './App.css';

import geoJson from './geojson/paths.json';
import { getStartEndLocations, getBuildingFloorOptions, getBuildingOptions, getFloorOptions, OptionType } from './map/locations';
import { Dijkstra, AdjacencyList, Route, GraphLocation } from './algorithm/dijkstra';
import displayRoute from './map/displayRoute';
import useLoadMap from './map/loadMap';
import useGoogleMapsLibrary from './hooks/useGoogleMapsLibrary';
import updateLocation from './map/updateLocation';
import DirectionsListItem from './components/DirectionsListItem';
import useBaseGeoJson from './hooks/useBaseGeoJson';


function App() {
	const UWMap = useMemo(() => new Dijkstra(new AdjacencyList(geoJson)), []);
	const { googleMap } = useLoadMap();
	const { library: Markers } = useGoogleMapsLibrary("marker");


	const startEndLocations = useMemo(getStartEndLocations, []);
	const buildingFloorOptions = useMemo(getBuildingFloorOptions, []);


	const [startBuilding, setStartBuilding] = useState<SingleValue<OptionType>>(null);
	const [startFloor, setStartFloor] = useState<SingleValue<OptionType>>(null);
	const [startLocationMarker, setStartLocationMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
	const [endBuilding, setEndBuilding] = useState<SingleValue<OptionType>>(null);
	const [endFloor, setEndFloor] = useState<SingleValue<OptionType>>(null);
	const [endLocationMarker, endStartLocationMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
	const [tunnellingPreference, setTunnellingPreference] = useState<OptionType>(Dijkstra.COMPARATOR_OPTIONS[0]);


	const [hasRoute, setHasRoute] = useState(false);
	const [route, setRoute] = useState<Route | null>(null);
	const [routeClear, setRouteClear] = useState<() => void>(() => () => { });


	const [showInput, setShowInput] = useState(true);
	const [showDirections, setShowDirections] = useState(false);


	const buildingOptions = useMemo(getBuildingOptions(buildingFloorOptions), []);
	const startFloorOptions = useMemo(getFloorOptions(buildingFloorOptions, startBuilding), [startBuilding]);
	const endFloorOptions = useMemo(getFloorOptions(buildingFloorOptions, endBuilding), [endBuilding]);


	const startLocation = useMemo(updateLocation(
		startBuilding, startFloor, startEndLocations, startLocationMarker, setStartLocationMarker, route, setRoute,
		routeClear, setRouteClear, setHasRoute, googleMap, Markers
	), [startBuilding, startFloor, tunnellingPreference]);
	const endLocation = useMemo(updateLocation(
		endBuilding, endFloor, startEndLocations, endLocationMarker, endStartLocationMarker, route, setRoute,
		routeClear, setRouteClear, setHasRoute, googleMap, Markers,
		Markers ? new Markers.PinElement({
			background: '#009933',
			borderColor: '#196619',
			glyphColor: '#196619'
		}).element : undefined
	), [endBuilding, endFloor, tunnellingPreference]);

	useBaseGeoJson(googleMap, geoJson, hasRoute);


	// update route on map
	useEffect(() => {
		if (hasRoute) {
			console.log(route?.graphLocations);
			routeClear();
			setRouteClear(displayRoute(googleMap, route));
		}
	}, [route, hasRoute]);


	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (googleMap && startLocation && endLocation) {
			console.log(`Start: ${startLocation.toString()}, End: ${endLocation.toString()}`);
			setRoute(UWMap.calculateRoute(startLocation, endLocation, Dijkstra.COMPARATORS.get(tunnellingPreference.value)));
			setHasRoute(true);
			setShowDirections(true);
			setShowInput(false);
		}
	};

	return (
		<div className="App flex flex-col items-center justify-center h-screen">

			<div id="map" className="relative z-0 flex h-[100%] w-[100%]"></div>

			<div id="header" className="absolute inset-y-[9%] md:inset-y-[2%] h-[5%] z-10 flex items-center justify-center">
				<h1 className="text-2xl md:text-3xl font-bold p-1 bg-white/75 shadow-2xl rounded-3xl">
					WATIsGrass: UW Tunnels
				</h1>
			</div>

			<div className="absolute top-[16%] md:top-[9%] z-10 flex space-x-2">
				<button
					onClick={() => setShowInput(!showInput)}
					className={`font-semibold rounded-md px-3 py-1 focus:outline-none ${showInput ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
				>
					{showInput ? 'Hide Input' : 'Show Input'}
				</button>

				{hasRoute && (
					<button
						onClick={() => setShowDirections(!showDirections)}
						className={`font-semibold rounded-md px-3 py-1 focus:outline-none ${showDirections ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
					>
						{showDirections ? 'Hide Directions' : 'Show Directions'}
					</button>
				)}
			</div>

			{showInput && (
				<div id="input" className="absolute inset-y-[22%] md:inset-y-[15%] h-[0%] z-10 max-w-auto w-[90%] sm:w-auto">
					<form className="flex flex-col sm:flex-row items-center space-y-4 sm:space-x-4 sm:space-y-0 p-4 bg-gray-100 rounded shadow-md w-full" onSubmit={handleSubmit}>
						<div className="flex flex-col w-full sm:w-auto">
							<label htmlFor="start-building" className="mb-1 text-gray-700 font-semibold">Start Building</label>
							<Select
								id="start-building"
								name="start-building"
								options={buildingOptions}
								className="react-select-container"
								classNamePrefix="react-select"
								value={startBuilding}
								onChange={newVal => {
									setStartBuilding(newVal);
									setStartFloor(null);
								}}
							/>
						</div>
						<div className="flex flex-col w-full sm:w-auto">
							<label htmlFor="start-floor" className="mb-1 text-gray-700 font-semibold">Start Floor</label>
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
						<div className="flex flex-col w-full sm:w-auto">
							<label htmlFor="end-building" className="mb-1 text-gray-700 font-semibold">End Building</label>
							<Select
								id="end-building"
								name="end-building"
								options={buildingOptions}
								className="react-select-container"
								classNamePrefix="react-select"
								value={endBuilding}
								onChange={newVal => {
									setEndBuilding(newVal);
									setEndFloor(null);
								}}
							/>
						</div>
						<div className="flex flex-col w-full sm:w-auto">
							<label htmlFor="end-floor" className="mb-1 text-gray-700 font-semibold">End Floor</label>
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
						<div className="flex flex-col w-full sm:w-auto">
							<label htmlFor="tunnelling-preference" className="mb-1 text-gray-700 font-semibold">Tunnelling Preference</label>
							<Select
								id="tunnelling-preference"
								name="tunnelling-preference"
								options={Dijkstra.COMPARATOR_OPTIONS}
								className="react-select-container"
								classNamePrefix="react-select"
								value={tunnellingPreference}
								onChange={newVal => setTunnellingPreference(newVal)}
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
			)}

			{hasRoute && googleMap && Markers && showDirections ?
				<div className="flex justify-center">
					<div
						id="directions"
						className="md:left-[2%] absolute center w-auto top-[25%] max-h-[65%] overflow-y-auto z-20 py-4 bg-gray-200/85 shadow-2xl"
					>
						{route != null ? <>
							<div className="pb-2">
								{statsString(route).map(str =>
									<div>{str}</div>
								)}
							</div>
							{route.graphLocations.slice(1).map((graphLocation, idx) =>
								<DirectionsListItem googleMap={googleMap} graphLocation={graphLocation} order={idx + 1} Markers={Markers} />)}
						</> : 'No routes found :('}
					</div>
				</div>
				: ''}

			<div id="footer" className="absolute bottom-[1%] z-10 bg-white/75 p-1 text-center hidden md:block">
				Comments/suggestions? Contact us at{' '}
				<a
					className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
					href="mailto:watisgrass5@gmail.com"
				>
					watisgrass5@gmail.com
				</a>. Also check out our{' '}
				<a
					className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
					href="https://github.com/rickyqin005/WATIsGrass"
				>
					Github
				</a>!
			</div>
		</div>
	);
}

export default App;

function statsString(route: Route) {
	const end = route.graphLocations.at(-1) as GraphLocation;
	const time = Math.round(end.time / 60);
	return [
		`Time: ${time == 0 ? '<1' : time}min, Distance: ${Math.round(end.distance ?? 0).toLocaleString()}m`,
		`⬆️${end.floorsAscended} floors, ⬇️ ${end.floorsDescended} floors`
	];
}
