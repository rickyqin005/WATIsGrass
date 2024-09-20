import { useMemo } from "react";
import { GraphLocation } from "../algorithm/dijkstra";
import formatPolyLine from "../map/formatPolyLine";

export default function DirectionsListItem({ graphLocation, googleMap, order }: { graphLocation: GraphLocation, googleMap: any, order: number }) {
    const highlightedSegment = useMemo(() => [
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
    ], []);
    return <div className="flex text-left px-5 hover:bg-gray-300/85">
        <div className="min-w-7">{`${order}.`}</div>
        <div
            onMouseEnter={() => highlightedSegment.forEach(segment => segment.setMap(googleMap))}
            onMouseLeave={() => highlightedSegment.forEach(segment => segment.setMap(null))}>
            {graphLocation.toDirectionsString()}
        </div>
    </div>;
}
