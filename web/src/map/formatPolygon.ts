export default function formatPolygon(path: [number, number][]): google.maps.PolygonOptions {
    return {
        paths: path.map(point => { return { lat: point[1], lng: point[0] } }) as any[],
        fillColor: 'black',
        fillOpacity: 0.15,
        strokeColor: 'black',
        strokeWeight: 0.5,
        strokeOpacity: 0.5,
        zIndex: -1
    };
}
