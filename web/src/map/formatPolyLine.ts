export default function formatPolyLine(path: [number, number][], type: string): google.maps.PolylineOptions {
    let strokeColor = 'black';
    if(type == 'bridge') strokeColor = 'green';
    if(type == 'hallway') strokeColor = '#668cff';
    if(type == 'tunnel') strokeColor = '#86592d';
    if(type == 'walkway') strokeColor = '#ff6666';
    return {
        path: path.map(point => { return { lat: point[1], lng: point[0] } }) as any[],
        strokeColor: strokeColor,
        strokeWeight: 4,
        zIndex: 0
    };
}
