import { useEffect, useMemo } from "react";
import { Coordinate } from "../algorithm/dijkstra";
import { GraphLocation } from "../algorithm/dijkstra";
import formatPolyLine from "../map/formatPolyLine";
import { GoogleMapsLibrary } from "../map/GoogleMapsLibrary";

export default function DirectionsListItem({ graphLocation, googleMap, order, onlyHighlightOnHover, Markers }:
    { graphLocation: GraphLocation, googleMap: any, order: number, onlyHighlightOnHover: boolean, Markers: GoogleMapsLibrary }) {
    const highlightedSegment = useMemo(() => {
        if(graphLocation) {
            if(graphLocation.path.length == 1) {
                return [
                    new Markers.AdvancedMarkerElement({
                        position: new Coordinate(graphLocation.path[0]).toGoogleMapsCoordinate(),
                        content: new Markers.PinElement({
                            background: '#808080',
                            borderColor: '#4d4d4d',
                            glyphColor: '#4d4d4d'
                        }).element
                    })
                ];
            } else return [
                new google.maps.Polyline({
                    ...formatPolyLine(graphLocation.path, graphLocation.travelMode ?? ""),
                    strokeWeight: 6,
                    zIndex: 3
                }),
                new google.maps.Polyline({
                    ...formatPolyLine(graphLocation.path, graphLocation.travelMode ?? ""),
                    strokeColor: 'black',
                    strokeWeight: 10,
                    zIndex: 2
                }),
            ]
        } else {
            return [];
        }
    }, [graphLocation]);
    useEffect(() => {
        if(!onlyHighlightOnHover) {
            highlightedSegment.forEach(segment => segment.setMap(googleMap));
            return () => highlightedSegment.forEach(segment => segment.setMap(null));
        }
    }, [graphLocation, onlyHighlightOnHover]);

    const directionsString = graphLocation?.toDirectionsString() ?? ['', ''];
    
    return <div className="flex text-left px-2 pb-1 hover:bg-gray-300/85"
        onMouseEnter={onlyHighlightOnHover ? () => highlightedSegment.forEach(segment => segment.setMap(googleMap)) : undefined}
        onMouseLeave={onlyHighlightOnHover ? () => highlightedSegment.forEach(segment => segment.setMap(null)) : undefined}>
        <div className="min-w-7">{`${order}.`}</div>
        <div>
            {directionsString[0] != '' ? <span
                className={`text-base rounded-md ${directionsString[0] == 'Outdoor' ? 'bg-gray-400' :
                        directionsString[0] == 'Stairs' ? 'bg-violet-400':
                        directionsString[0] == 'Elevator' ? 'bg-pink-400' :
                        directionsString[0] == 'Bridge' ? 'bg-green-400' :
                        directionsString[0] == 'Tunnel' ? 'bg-amber-400' : ''} px-1 m-1`}>
                    {directionsString[0]}</span> : ''}
            {directionsString[1]}
        </div>
    </div>;
}
