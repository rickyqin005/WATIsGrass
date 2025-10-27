export default function formatPolygon(path: [number, number][]): google.maps.PolygonOptions {
    return {
        paths: path.map(point => { return { lat: point[1], lng: point[0] } }) as any[],
        fillColor: 'black',
        fillOpacity: 0.15,
        strokeColor: 'black',
        strokeWeight: 0.4,
        strokeOpacity: 1,
        zIndex: -1
    };
}
