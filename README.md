# WATIsGrass

A helpful guide to navigate UW's bridges and tunnels! Just enter a start and end location and it will calculate the shortest possible indoor route for you.

## GeoJSON Format Specifications

Internally, the list of buildings and the paths connecting them are stored in GeoJSON format in the `web/src/geojson` folder.

To represent a certain building and floor, we define the `BuildingFloor` type as:
```typescript
type BuildingFloor = {
    buildingCode: string,
    floor: string
}
```

The `properties` property for each feature is described as follows:

## For `paths.json`

This geoJSON file contains only `LineString` and `Point` features. It represents all possible connections between `BuildingFloor`s and will be converted into a Graph object on which Dijkstra's Algorithm is run.

### `LineString` features

- `type` (required): One of `hallway`, `bridge`, `tunnel` or `walkway`.\
`hallway` must have the same start `start` and `end` location, while `walkway` must have `start` and `end` equal to `{ buildingCode: "OUT", floor: "0" }`
- `start` (required): The starting location, a `BuildingFloor`
- `end` (required): The ending location, a `BuildingFloor`

### Stairs

Must be a `Point` feature.

- `type` (required): `stairs`
- `connections` (required): An array of objects of the form
```typescript
{
    buildingCode: string,
    floor: string,
    level: number
}
```
Note that the `level` property represents the relative height of a floor (can be an integer or end with `.5`). For instance, going from a floor with level `1.5` to a floor with level `4` means going up by `4 - 1.5 = 2.5` floors.

### Door

Must be a `Point` feature.

Used to represent two adjacent buildings connected by a door. Has `type: "door"` and `start` and `end` representing the connected `BuildingFloor`s.

### Open

Must be a `Point` feature.

Used to represent two adjacent buildings connected without a door (essentially the same building), such as E7/E5. Has `type: "open"` and `start` and `end` representing the connected `BuildingFloor`s.

### For `buildings.json`

This geoJSON file only contains `Point` features, where each point maps a building and (some, but not necessarily all of) its floors to a coordinate mentioned in `paths.json`, allowing the starting and ending point to be placed somewhere on the graph.

- `type` (required): `building`
- `building` (required): An object of the form
```typescript
{
    buildingCode: string,
    floors: string[]
}
```
