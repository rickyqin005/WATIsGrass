import { useMemo } from "react";
import { GraphLocation } from "../algorithm/dijkstra";

export default function DirectionsListItem({ graphLocation, googleMap, order }: { graphLocation: GraphLocation, googleMap: any, order: number }) {
    const highlightedSegment = useMemo(() => new google.maps.Polyline({
        path: graphLocation.path.map(point => { return { lat: point[1], lng: point[0] } }) as any[],
        strokeColor: 'blue',
        strokeWeight: 6,
        zIndex: 2
    }), []);
    return <div className="flex text-left px-5 hover:bg-gray-300/85">
        <div className="min-w-7">{`${order}.`}</div>
        <div
            onMouseEnter={() => highlightedSegment.setMap(googleMap)}
            onMouseLeave={() => highlightedSegment.setMap(null)}>
            {graphLocation.toDirectionsString()}
        </div>
    </div>;
}
